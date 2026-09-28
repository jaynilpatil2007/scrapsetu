import { prisma } from "@/lib/db/prisma";

type PriceResult = {
  minPricePerUnit: number;
  maxPricePerUnit: number;
  estimatedMinValue: number;
  estimatedMaxValue: number;
  source: string;
};

export async function calculateLotPrice(lotId: string): Promise<PriceResult> {
  const lot = await prisma.lot.findUnique({
    where: {
      id: lotId,
    },
    include: {
      material: true,
    },
  });

  if (!lot) {
    throw new Error("Lot not found");
  }

  if (lot.status !== "READY") {
    throw new Error("Lot must be READY before pricing");
  }

  if (!lot.confirmedCategory || !lot.confirmedSubcategory) {
    throw new Error("Material must be confirmed before pricing");
  }

  /*
   * Get recent historical prices for the material.
   */
  const priceRecords = await prisma.priceRecord.findMany({
    where: {
      materialId: lot.materialId,
      ...(lot.collectionLocation
        ? {
            city: lot.collectionLocation,
          }
        : {}),
    },
    orderBy: {
      recordedAt: "desc",
    },
    take: 20,
  });

  /*
   * If local prices are unavailable,
   * fallback to all recent prices.
   */
  let records = priceRecords;

  if (records.length === 0) {
    records = await prisma.priceRecord.findMany({
      where: {
        materialId: lot.materialId,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 20,
    });
  }

  if (records.length === 0) {
    throw new Error("No pricing data available for this material");
  }

  const prices = records.map((record) => record.buyingPrice);

  const minObserved = Math.min(...prices);
  const maxObserved = Math.max(...prices);

  /*
   * Use a conservative range around
   * recent observed market prices.
   */
  const minPricePerUnit = minObserved;
  const maxPricePerUnit = maxObserved;

  const estimatedMinValue = minPricePerUnit * lot.approxWeight;

  const estimatedMaxValue = maxPricePerUnit * lot.approxWeight;

  return {
    minPricePerUnit,
    maxPricePerUnit,
    estimatedMinValue,
    estimatedMaxValue,
    source:
      priceRecords.length > 0 ? "LOCAL_PRICE_RECORDS" : "RECENT_PRICE_RECORDS",
  };
}
