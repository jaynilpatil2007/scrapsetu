import crypto from "crypto";

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
    // 1. Authenticate collector
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

    // 2. Get lot ID
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

    // 3. Read confirmation data
    const body = await request.json();

    const { confirmedCategory, confirmedSubcategory } = body;

    if (!confirmedCategory) {
      return NextResponse.json(
        {
          success: false,
          error: "confirmedCategory is required",
        },
        { status: 400 },
      );
    }

    if (!confirmedSubcategory) {
      return NextResponse.json(
        {
          success: false,
          error: "confirmedSubcategory is required",
        },
        { status: 400 },
      );
    }

    // 4. Find lot belonging to current collector
    const lot = await prisma.lot.findFirst({
      where: {
        id: lotId,
        collectorId: user.collector.id,
      },
      include: {
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

    // 5. Make sure AI analysis happened first
    if (!lot.aiCategory || !lot.aiSubcategory) {
      return NextResponse.json(
        {
          success: false,
          error: "Material analysis must be completed before confirmation",
        },
        { status: 400 },
      );
    }

    // 6. Update lot + traceability atomically
    const result = await prisma.$transaction(async (tx) => {
      const updatedLot = await tx.lot.update({
        where: {
          id: lot.id,
        },

        data: {
          confirmedCategory,
          confirmedSubcategory,
          status: "READY",
        },

        include: {
          material: true,
          images: true,
        },
      });

      // Get previous traceability event
      const previousEvent = await tx.traceabilityEvent.findFirst({
        where: {
          lotId: lot.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const metadata = {
        aiCategory: lot.aiCategory,
        aiSubcategory: lot.aiSubcategory,
        aiConfidence: lot.aiConfidence,
        confirmedCategory,
        confirmedSubcategory,
      };

      const eventHash = createHashForTransaction({
        lotId: lot.id,
        eventType: "MATERIAL_CONFIRMED",
        actorType: "COLLECTOR",
        actorId: user.collector!.id,
        metadata,
        previousHash: previousEvent?.eventHash ?? null,
      });

      await tx.traceabilityEvent.create({
        data: {
          lotId: lot.id,

          eventType: "MATERIAL_CONFIRMED",
          actorType: "COLLECTOR",
          actorId: user.collector!.id,

          metadata,

          previousHash: previousEvent?.eventHash ?? null,

          eventHash,
        },
      });

      return updatedLot;
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Confirm material error:", error);

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
          error instanceof Error ? error.message : "Failed to confirm material",
      },
      { status: 500 },
    );
  }
}

function createHashForTransaction(input: {
  lotId: string;
  eventType: string;
  actorType: string;
  actorId?: string | null;
  metadata?: unknown;
  previousHash?: string | null;
}) {
  const payload = JSON.stringify({
    lotId: input.lotId,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    metadata: input.metadata ?? null,
    previousHash: input.previousHash ?? null,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}
