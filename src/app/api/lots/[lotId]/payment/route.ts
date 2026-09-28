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

    const paymentMethod = body.paymentMethod ?? "UPI";

    if (!["CASH", "UPI", "BANK_TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment method",
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
        transaction: {
          include: {
            payout: true,
          },
        },
        handover: true,
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

    if (lot.status !== "HANDED_OVER") {
      return NextResponse.json(
        {
          success: false,
          error: "Lot must be handed over before payment",
        },
        { status: 400 },
      );
    }

    if (!lot.transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found",
        },
        { status: 400 },
      );
    }

    if (!lot.handover) {
      return NextResponse.json(
        {
          success: false,
          error: "Handover record not found",
        },
        { status: 400 },
      );
    }

    const transaction = lot.transaction;

    if (transaction.paymentStatus === "PAID") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment already completed",
        },
        { status: 400 },
      );
    }

    const amount = transaction.finalPrice;

    const providerPaymentId = `MOCKPAY-${crypto.randomBytes(8).toString("hex")}`;

    const result = await prisma.$transaction(async (tx) => {
      const payout = transaction.payout
        ? await tx.payout.update({
            where: {
              transactionId: transaction.id,
            },
            data: {
              amount,
              method: paymentMethod,
              provider: "MOCK_PROVIDER",
              providerPayoutId: providerPaymentId,
              destinationType: "COLLECTOR",
              status: "SUCCESS",
            },
          })
        : await tx.payout.create({
            data: {
              transactionId: transaction.id,
              amount,
              method: paymentMethod,
              provider: "MOCK_PROVIDER",
              providerPayoutId: providerPaymentId,
              destinationType: "COLLECTOR",
              status: "SUCCESS",
            },
          });

      const updatedTransaction = await tx.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          paymentMethod,
          paymentStatus: "PAID",
          completedAt: new Date(),
        },
      });

      await tx.lot.update({
        where: {
          id: lot.id,
        },
        data: {
          status: "COMPLETED",
        },
      });

      const lastEvent = await tx.traceabilityEvent.findFirst({
        where: {
          lotId: lot.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const eventPayload = {
        lotId: lot.id,
        transactionId: transaction.id,
        payoutId: payout.id,
        amount,
        paymentMethod,
        providerPaymentId,
        previousHash: lastEvent?.eventHash ?? null,
      };

      const eventHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(eventPayload))
        .digest("hex");

      const event = await tx.traceabilityEvent.create({
        data: {
          lotId: lot.id,
          eventType: "PAYMENT_COMPLETED",
          actorType: "SYSTEM",
          actorId: user.id,

          metadata: {
            transactionId: transaction.id,
            payoutId: payout.id,
            amount,
            paymentMethod,
            provider: "MOCK_PROVIDER",
            providerPaymentId,
          },

          previousHash: lastEvent?.eventHash ?? null,
          eventHash,
        },
      });

      return {
        payout,
        transaction: updatedTransaction,
        event,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Payment completed successfully",
        data: {
          transaction: result.transaction,
          payout: result.payout,
          verificationHash: result.event.eventHash,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Payment error:", error);

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
          error instanceof Error ? error.message : "Failed to complete payment",
      },
      { status: 500 },
    );
  }
}
