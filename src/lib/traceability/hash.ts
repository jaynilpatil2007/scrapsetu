import crypto from "crypto";

export function generateEventHash(input: {
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
