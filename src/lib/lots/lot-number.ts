import crypto from "crypto";

export function generateLotNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  const random = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `SS-${date}-${random}`;
}
