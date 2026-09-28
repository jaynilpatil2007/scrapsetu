import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    lotId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
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
      include: {
        material: true,
        transaction: {
          include: {
            recycler: true,
            payout: true,
          },
        },
        handover: true,
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

    const events = lot.events.map((event) => ({
      id: event.id,
      type: event.eventType,
      actor: event.actorType,
      actorId: event.actorId,
      location: {
        latitude: event.latitude,
        longitude: event.longitude,
      },
      metadata: event.metadata,
      previousHash: event.previousHash,
      eventHash: event.eventHash,
      createdAt: event.createdAt,
    }));

    return NextResponse.json({
      success: true,

      data: {
        lot: {
          id: lot.id,
          lotNumber: lot.lotNumber,
          status: lot.status,

          material: {
            category:
              lot.confirmedCategory ?? lot.aiCategory ?? lot.material.category,

            subcategory:
              lot.confirmedSubcategory ??
              lot.aiSubcategory ??
              lot.material.subcategory,
          },

          weight: lot.approxWeight,

          priceRange: {
            min: lot.estimatedMinValue,
            max: lot.estimatedMaxValue,
          },
        },

        transaction: lot.transaction
          ? {
              id: lot.transaction.id,
              transactionNumber: lot.transaction.transactionNumber,

              recycler: {
                id: lot.transaction.recycler.id,
                name: lot.transaction.recycler.name,
                city: lot.transaction.recycler.city,
                state: lot.transaction.recycler.state,
              },

              quotedPrice: lot.transaction.quotedPrice,

              finalPrice: lot.transaction.finalPrice,

              paymentMethod: lot.transaction.paymentMethod,

              paymentStatus: lot.transaction.paymentStatus,

              completedAt: lot.transaction.completedAt,
            }
          : null,

        handover: lot.handover
          ? {
              id: lot.handover.id,
              reference: lot.handover.handoverReference,

              weight: lot.handover.weight,

              latitude: lot.handover.latitude,

              longitude: lot.handover.longitude,

              photoUrl: lot.handover.photoUrl,

              verificationHash: lot.handover.verificationHash,

              collectorConfirmedAt: lot.handover.collectorConfirmedAt,

              recyclerConfirmedAt: lot.handover.recyclerConfirmedAt,
            }
          : null,

        events,
      },
    });
  } catch (error) {
    console.error("Traceability error:", error);

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
          error instanceof Error
            ? error.message
            : "Failed to fetch traceability",
      },
      { status: 500 },
    );
  }
}
