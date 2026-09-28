import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    lotId: string;
    quoteId: string;
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

    const { lotId, quoteId } = await params;

    const quote = await prisma.priceQuote.findFirst({
      where: {
        id: quoteId,
        lotId,
      },
      include: {
        lot: true,
        recycler: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 },
      );
    }

    if (quote.lot.collectorId !== user.collector.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not own this lot",
        },
        { status: 403 },
      );
    }

    if (quote.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Quote is no longer active",
        },
        { status: 400 },
      );
    }

    if (quote.expiresAt && quote.expiresAt < new Date()) {
      await prisma.priceQuote.update({
        where: {
          id: quote.id,
        },
        data: {
          status: "EXPIRED",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Quote has expired",
        },
        { status: 400 },
      );
    }

    const transactionNumber = `TXN-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          transactionNumber,

          lotId: quote.lot.id,
          collectorId: user.collector!.id,
          recyclerId: quote.recyclerId,

          quotedPrice: quote.quotedPrice,
          finalPrice: quote.quotedTotal ?? 0,

          quotedWeight: quote.lot.approxWeight,

          paymentMethod: "UPI",
          paymentStatus: "PENDING",

          collectionLocation: quote.lot.collectionLocation,
        },
      });

      await tx.priceQuote.update({
        where: {
          id: quote.id,
        },
        data: {
          status: "ACCEPTED",
        },
      });

      await tx.lot.update({
        where: {
          id: quote.lot.id,
        },
        data: {
          status: "PICKUP_REQUESTED",
        },
      });

      const lastEvent = await tx.traceabilityEvent.findFirst({
        where: {
          lotId: quote.lot.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const eventData = {
        lotId: quote.lot.id,
        eventType: "QUOTE_ACCEPTED",
        actorType: "COLLECTOR",
        actorId: user.id,
        metadata: {
          quoteId: quote.id,
          recyclerId: quote.recyclerId,
          quotedPrice: quote.quotedPrice,
          quotedTotal: quote.quotedTotal,
        },
        previousHash: lastEvent?.eventHash ?? null,
      };

      const crypto = await import("crypto");

      const eventHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            ...eventData,
            timestamp: new Date().toISOString(),
          }),
        )
        .digest("hex");

      const event = await tx.traceabilityEvent.create({
        data: {
          ...eventData,
          eventHash,
        },
      });

      return {
        transaction,
        event,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quote accepted successfully",
        data: result.transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Accept quote error:", error);

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
          error instanceof Error ? error.message : "Failed to accept quote",
      },
      { status: 500 },
    );
  }
}
