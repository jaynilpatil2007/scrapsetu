import crypto from "crypto";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { generateLotNumber } from "@/lib/lots/lot-number";

export async function POST(request: Request) {
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

    const body = await request.json();

    const {
      materialId,
      description,
      approxWeight,
      condition,
      sourceType,
      collectionLatitude,
      collectionLongitude,
      collectionLocation,
      images,
    } = body;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: "materialId is required",
        },
        { status: 400 },
      );
    }

    if (typeof approxWeight !== "number" || approxWeight <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "approxWeight must be greater than 0",
        },
        { status: 400 },
      );
    }

    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
      },
    });

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found",
        },
        { status: 404 },
      );
    }

    const lot = await prisma.$transaction(async (tx) => {
      const createdLot = await tx.lot.create({
        data: {
          lotNumber: generateLotNumber(),

          collectorId: user.collector!.id,
          materialId,

          description,
          approxWeight,
          condition,
          sourceType,

          collectionLatitude,
          collectionLongitude,
          collectionLocation,

          status: "DRAFT",

          images:
            Array.isArray(images) && images.length > 0
              ? {
                  create: images
                    .map((image: unknown) => {
                      if (typeof image === "string") {
                        return { url: image };
                      }

                      if (
                        typeof image === "object" &&
                        image !== null &&
                        "url" in image &&
                        typeof image.url === "string"
                      ) {
                        return { url: image.url };
                      }

                      return null;
                    })
                    .filter(
                      (image): image is { url: string } => image !== null,
                    ),
                }
              : undefined,
        },

        include: {
          material: true,
          images: true,
        },
      });

      const previousEvent = await tx.traceabilityEvent.findFirst({
        where: {
          lotId: createdLot.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const eventHash = createHashForTransaction({
        lotId: createdLot.id,
        eventType: "LOT_CREATED",
        actorType: "COLLECTOR",
        actorId: user.collector!.id,
        metadata: {
          lotNumber: createdLot.lotNumber,
          materialId,
          approxWeight,
        },
        previousHash: previousEvent?.eventHash ?? null,
      });

      await tx.traceabilityEvent.create({
        data: {
          lotId: createdLot.id,

          eventType: "LOT_CREATED",
          actorType: "COLLECTOR",
          actorId: user.collector!.id,

          metadata: {
            lotNumber: createdLot.lotNumber,
            materialId,
            approxWeight,
          },

          previousHash: previousEvent?.eventHash ?? null,

          eventHash,
        },
      });

      return createdLot;
    });

    return NextResponse.json(
      {
        success: true,
        data: lot,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create lot error:", error);

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
        error: error instanceof Error ? error.message : "Failed to create lot",
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

export async function GET() {
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

    const lots = await prisma.lot.findMany({
      where: {
        collectorId: user.collector.id,
      },

      include: {
        material: true,
        images: true,
        quotes: {
          include: {
            recycler: true,
          },
        },
        transaction: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: lots,
    });
  } catch (error) {
    console.error("Get lots error:", error);

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
        error: "Failed to fetch lots",
      },
      { status: 500 },
    );
  }
}
