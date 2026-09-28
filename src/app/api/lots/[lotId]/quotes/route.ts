import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

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

    const body = await request.json();

    const { recyclerId } = body;

    if (!recyclerId) {
      return NextResponse.json(
        {
          success: false,
          error: "recyclerId is required",
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
          error: "Lot must be READY before requesting a quote",
        },
        { status: 400 },
      );
    }

    const recyclerMaterial = await prisma.recyclerMaterial.findUnique({
      where: {
        recyclerId_materialId: {
          recyclerId,
          materialId: lot.materialId,
        },
      },
      include: {
        recycler: true,
      },
    });

    if (!recyclerMaterial) {
      return NextResponse.json(
        {
          success: false,
          error: "Recycler does not accept this material",
        },
        { status: 400 },
      );
    }

    if (recyclerMaterial.recycler.authorizationStatus !== "VERIFIED") {
      return NextResponse.json(
        {
          success: false,
          error: "Recycler is not verified",
        },
        { status: 400 },
      );
    }

    const quotedPrice = recyclerMaterial.offeredRate;

    const quotedTotal = quotedPrice * lot.approxWeight;

    const expiresAt = new Date();

    expiresAt.setHours(expiresAt.getHours() + 24);

    const quote = await prisma.priceQuote.create({
      data: {
        lotId: lot.id,
        recyclerId,
        quotedPrice,
        quotedTotal,
        expiresAt,
        status: "ACTIVE",
      },
      include: {
        recycler: true,
        lot: {
          include: {
            material: true,
          },
        },
      },
    });

    await prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        status: "MATCHING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create quote error:", error);

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
          error instanceof Error ? error.message : "Failed to create quote",
      },
      { status: 500 },
    );
  }
}
