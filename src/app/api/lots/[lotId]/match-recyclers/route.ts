import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { findMatchingRecyclers } from "@/lib/recyclers/matching";

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

    if (!lotId) {
      return NextResponse.json(
        {
          success: false,
          error: "lotId is required",
        },
        { status: 400 },
      );
    }

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

    if (lot.status !== "READY") {
      return NextResponse.json(
        {
          success: false,
          error: "Lot must be READY before matching recyclers",
        },
        { status: 400 },
      );
    }

    const recyclers = await findMatchingRecyclers({
      materialId: lot.materialId,
      latitude: lot.collectionLatitude ?? undefined,
      longitude: lot.collectionLongitude ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        material: {
          category: lot.confirmedCategory,
          subcategory: lot.confirmedSubcategory,
        },
        weight: lot.approxWeight,
        count: recyclers.length,
        recyclers: recyclers.map((recycler) => ({
          ...recycler,
          estimatedAmount: recycler.offeredRate * lot.approxWeight,
        })),
      },
    });
  } catch (error) {
    console.error("Recycler matching error:", error);

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
          error instanceof Error ? error.message : "Failed to match recyclers",
      },
      { status: 500 },
    );
  }
}
