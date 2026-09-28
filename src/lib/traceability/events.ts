import { prisma } from "@/lib/db/prisma";
import { generateEventHash } from "./hash";

export async function createTraceabilityEvent(input: {
  lotId: string;
  eventType: string;
  actorType: string;
  actorId?: string | null;
  metadata?: unknown;
}) {
  const previousEvent = await prisma.traceabilityEvent.findFirst({
    where: {
      lotId: input.lotId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const previousHash = previousEvent?.eventHash ?? null;

  const eventHash = generateEventHash({
    lotId: input.lotId,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId,
    metadata: input.metadata,
    previousHash,
  });

  return prisma.traceabilityEvent.create({
    data: {
      lotId: input.lotId,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      metadata: input.metadata ?? undefined,
      previousHash,
      eventHash,
    },
  });
}
