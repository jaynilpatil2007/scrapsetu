import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { calculateLotPrice } from "@/lib/pricing/price-engine";

type RouteContext = {
  params: Promise<{
    lotId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireCurrentUser();

    if (!user.collector) {
      return NextResponse.json(
        {
          success: false,
          error: "Collector profile not found",
        },
        { status: 400 },
      );
    }

    const { lotId } = await params;

    const lot = await prisma.lot.findFirst({
      where: {
        id: lotId,
        collectorId: user.collector.id,
      },
    });

    if (!lot) {
      return NextResponse.json(
        {
          success: false,
          error: "Lot not found",
        },
        { status: 404 },
      );
    }

    const pricing = await calculateLotPrice(lot.id);

    const updatedLot = await prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        estimatedMinValue: pricing.estimatedMinValue,
        estimatedMaxValue: pricing.estimatedMaxValue,
      },
      include: {
        material: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        lotId: updatedLot.id,
        lotNumber: updatedLot.lotNumber,

        material: {
          category: updatedLot.confirmedCategory,
          subcategory: updatedLot.confirmedSubcategory,
        },

        weight: updatedLot.approxWeight,

        pricePerUnit: {
          min: pricing.minPricePerUnit,
          max: pricing.maxPricePerUnit,
        },

        estimatedValue: {
          min: pricing.estimatedMinValue,
          max: pricing.estimatedMaxValue,
        },

        source: pricing.source,
      },
    });
  } catch (error) {
    console.error("Price calculation error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to calculate price",
      },
      { status: 500 },
    );
  }
}
