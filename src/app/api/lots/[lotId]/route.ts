import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { createTraceabilityEvent } from "@/lib/traceability/events";

type RouteContext = {
  params: Promise<{
    lotId: string;
  }>;
};

const UpdateLotSchema = z.object({
  confirmedCategory: z.string().min(1).optional(),
  confirmedSubcategory: z.string().optional(),

  description: z.string().optional(),
  approxWeight: z.number().positive().optional(),
  condition: z.string().optional(),
  sourceType: z.string().optional(),

  status: z
    .enum([
      "DRAFT",
      "READY",
      "MATCHING",
      "PICKUP_REQUESTED",
      "HANDED_OVER",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { lotId } = await context.params;

    const lot = await prisma.lot.findUnique({
      where: {
        id: lotId,
      },

      include: {
        material: true,
        images: true,

        transaction: {
          include: {
            payout: true,
          },
        },

        handover: true,

        quotes: {
          include: {
            recycler: true,
          },
        },

        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
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

    return NextResponse.json({
      success: true,
      data: lot,
    });
  } catch (error) {
    console.error("Get lot error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lot",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { lotId } = await context.params;

    const body = await req.json();
    const input = UpdateLotSchema.parse(body);

    const existingLot = await prisma.lot.findUnique({
      where: {
        id: lotId,
      },
    });

    if (!existingLot) {
      return NextResponse.json(
        {
          success: false,
          error: "Lot not found",
        },
        { status: 404 },
      );
    }

    const lot = await prisma.lot.update({
      where: {
        id: lotId,
      },

      data: {
        ...(input.confirmedCategory !== undefined && {
          confirmedCategory: input.confirmedCategory,
        }),

        ...(input.confirmedSubcategory !== undefined && {
          confirmedSubcategory: input.confirmedSubcategory,
        }),

        ...(input.description !== undefined && {
          description: input.description,
        }),

        ...(input.approxWeight !== undefined && {
          approxWeight: input.approxWeight,
        }),

        ...(input.condition !== undefined && {
          condition: input.condition,
        }),

        ...(input.sourceType !== undefined && {
          sourceType: input.sourceType,
        }),

        ...(input.status !== undefined && {
          status: input.status,
        }),
      },

      include: {
        material: true,
        images: true,
      },
    });

    await createTraceabilityEvent({
      lotId,
      eventType: "LOT_UPDATED",
      actorType: "COLLECTOR",
      metadata: {
        confirmedCategory: input.confirmedCategory,
        confirmedSubcategory: input.confirmedSubcategory,
        description: input.description,
        approxWeight: input.approxWeight,
        condition: input.condition,
        sourceType: input.sourceType,
        status: input.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: lot,
    });
  } catch (error) {
    console.error("Update lot error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update lot",
      },
      { status: 500 },
    );
  }
}
