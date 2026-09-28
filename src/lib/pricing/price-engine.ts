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

  console.log("lot: ", lot);

  if (!lot) {
    throw new Error("Lot not found");
  }

  if (lot.status !== "READY") {
    throw new Error("Lot must be READY before pricing");
  }

  if (!lot.confirmedCategory || !lot.confirmedSubcategory) {
    throw new Error("Material must be confirmed before pricing");
  }

  const category = lot.material.category;
  const subcategory = lot.material.subcategory;

  /*
   * 1. Exact material + local city
   */
  let records = await prisma.priceRecord.findMany({
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

  console.log("Records: ", records);

  let source = "LOCAL_PRICE_RECORDS";

  /*
   * 2. Exact material + any location
   */
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

    source = "RECENT_PRICE_RECORDS";
  }

  /*
   * 3. Same category + subcategory
   *
   * This handles cases where the lot references
   * a different Material row representing the
   * same real-world material.
   */
  if (records.length === 0) {
    records = await prisma.priceRecord.findMany({
      where: {
        material: {
          is: {
            category,
            subcategory,
          },
        },
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

    source = "MATCHING_MATERIAL_PRICE_RECORDS";
  }

  /*
   * 4. Same category + subcategory, any location
   */
  if (records.length === 0) {
    records = await prisma.priceRecord.findMany({
      where: {
        material: {
          is: {
            category,
            subcategory,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 20,
    });

    source = "MATCHING_MATERIAL_PRICE_RECORDS";
  }

  /*
   * 5. Same category only
   *
   * Final historical-price fallback.
   */
  if (records.length === 0) {
    records = await prisma.priceRecord.findMany({
      where: {
        material: {
          is: {
            category,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 20,
    });

    source = "CATEGORY_PRICE_RECORDS";
  }

  /*
   * If historical pricing exists, use it.
   */
  if (records.length > 0) {
    const prices = records.map((record) => record.buyingPrice);

    const minObserved = Math.min(...prices);
    const maxObserved = Math.max(...prices);

    return {
      minPricePerUnit: minObserved,
      maxPricePerUnit: maxObserved,

      estimatedMinValue: minObserved * lot.approxWeight,

      estimatedMaxValue: maxObserved * lot.approxWeight,

      source,
    };
  }

  /*
   * 6. Exact material recycler offers
   */
  let offers = await prisma.recyclerMaterial.findMany({
    where: {
      materialId: lot.materialId,
      recycler: {
        is: {
          authorizationStatus: "VERIFIED",
          ...(lot.collectionLocation
            ? {
                city: lot.collectionLocation,
              }
            : {}),
        },
      },
    },
    select: {
      offeredRate: true,
    },
  });

  /*
   * 7. Exact material + verified recycler,
   *    ignoring location
   */
  if (offers.length === 0) {
    offers = await prisma.recyclerMaterial.findMany({
      where: {
        materialId: lot.materialId,
        recycler: {
          is: {
            authorizationStatus: "VERIFIED",
          },
        },
      },
      select: {
        offeredRate: true,
      },
    });
  }

  /*
   * 8. Same category + subcategory recycler offers
   */
  if (offers.length === 0) {
    offers = await prisma.recyclerMaterial.findMany({
      where: {
        material: {
          is: {
            category,
            subcategory,
          },
        },
        recycler: {
          is: {
            authorizationStatus: "VERIFIED",
          },
        },
      },
      select: {
        offeredRate: true,
      },
    });
  }

  /*
   * 9. Same category only
   */
  if (offers.length === 0) {
    offers = await prisma.recyclerMaterial.findMany({
      where: {
        material: {
          is: {
            category,
          },
        },
        recycler: {
          is: {
            authorizationStatus: "VERIFIED",
          },
        },
      },
      select: {
        offeredRate: true,
      },
    });
  }

  if (offers.length === 0) {
    throw new Error(
      `No pricing data available for material category "${category}"`,
    );
  }

  const prices = offers.map((offer) => offer.offeredRate);

  const minObserved = Math.min(...prices);
  const maxObserved = Math.max(...prices);

  return {
    minPricePerUnit: minObserved,
    maxPricePerUnit: maxObserved,

    estimatedMinValue: minObserved * lot.approxWeight,

    estimatedMaxValue: maxObserved * lot.approxWeight,

    source: "VERIFIED_RECYCLER_OFFERS",
  };
}
