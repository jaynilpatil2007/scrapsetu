import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { analyzeMaterial } from "@/lib/ai/agents/material-agent";

type RouteContext = {
  params: Promise<{
    lotId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // 1. Authenticate user
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

    // 2. Get lotId from URL
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

    // 3. Find the lot belonging to this collector
    const lot = await prisma.lot.findFirst({
      where: {
        id: lotId,
        collectorId: user.collector.id,
      },
      include: {
        images: true,
        material: true,
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

    // 4. Make sure the lot has an image
    if (lot.images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No image found for this lot",
        },
        { status: 400 },
      );
    }

    // For MVP, analyze the first image.
    const imageUrl = lot.images[0].url;

    console.log("Analyzing lot:", lot.id);
    console.log("Image URL:", imageUrl);

    // 5. Run Material Classification Agent
    const analysis = await analyzeMaterial(imageUrl);

    console.log("Material analysis:", analysis);

    // 6. Save AI result to database
    const updatedLot = await prisma.lot.update({
      where: {
        id: lot.id,
      },
      data: {
        aiCategory: analysis.category,
        aiSubcategory: analysis.subcategory,
        aiConfidence: analysis.confidence,
        aiModel: "dots-studio/dots-3-note-preview:free",
      },
      include: {
        material: true,
        images: true,
      },
    });

    // 7. Return result
    return NextResponse.json(
      {
        success: true,

        data: {
          lot: updatedLot,

          analysis,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Material analysis error:", error);

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
          error instanceof Error ? error.message : "Material analysis failed",
      },
      { status: 500 },
    );
  }
}
