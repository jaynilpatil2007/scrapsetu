import { NextResponse } from "next/server";
import crypto from "crypto";

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

    const { weight, latitude, longitude, photoUrl } = body;

    if (!weight || weight <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid final weight is required",
        },
        { status: 400 },
      );
    }

    const lot = await prisma.lot.findFirst({
      where: {
        id: lotId,
        collectorId: user.collector.id,
      },
      include: {
        transaction: true,
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

    if (lot.status !== "PICKUP_REQUESTED") {
      return NextResponse.json(
        {
          success: false,
          error: "Lot is not ready for handover",
        },
        { status: 400 },
      );
    }

    if (!lot.transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found for this lot",
        },
        { status: 400 },
      );
    }

    const transaction = lot.transaction;

    const handoverReference = `HANDOVER-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const lastEvent = await prisma.traceabilityEvent.findFirst({
      where: {
        lotId: lot.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const hashPayload = {
      lotId: lot.id,
      transactionId: transaction.id,
      recyclerId: transaction.recyclerId,
      weight,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      handoverReference,
      previousHash: lastEvent?.eventHash ?? null,
    };

    const verificationHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(hashPayload))
      .digest("hex");

    const result = await prisma.$transaction(async (tx) => {
      const handover = await tx.handover.create({
        data: {
          lotId: lot.id,
          transactionId: transaction.id,
          recyclerId: transaction.recyclerId,

          weight,

          latitude: latitude ?? null,
          longitude: longitude ?? null,

          photoUrl: photoUrl ?? null,

          handoverReference,
          verificationHash,

          collectorConfirmedAt: new Date(),
        },
      });

      await tx.lot.update({
        where: {
          id: lot.id,
        },
        data: {
          status: "HANDED_OVER",
        },
      });

      const event = await tx.traceabilityEvent.create({
        data: {
          lotId: lot.id,

          eventType: "HANDOVER_COMPLETED",
          actorType: "COLLECTOR",
          actorId: user.id,

          latitude: latitude ?? null,
          longitude: longitude ?? null,

          metadata: {
            transactionId: transaction.id,
            recyclerId: transaction.recyclerId,
            handoverReference,
            weight,
            verificationHash,
          },

          previousHash: lastEvent?.eventHash ?? null,
          eventHash: verificationHash,
        },
      });

      return {
        handover,
        event,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Handover recorded successfully",
        data: result.handover,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Handover error:", error);

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
          error instanceof Error ? error.message : "Failed to record handover",
      },
      { status: 500 },
    );
  }
}
