import { prisma } from "../db/prisma";

type MatchInput = {
  materialId: string;
  latitude?: number;
  longitude?: number;
};

export async function findMatchingRecyclers(input: MatchInput) {
  const recyclers = await prisma.recycler.findMany({
    where: {
      authorizationStatus: "VERIFIED",

      materials: {
        some: {
          materialId: input.materialId,
        },
      },
    },

    include: {
      materials: {
        where: {
          materialId: input.materialId,
        },
      },
    },
  });

  return recyclers
    .map((recycler) => {
      const material = recycler.materials[0];

      if (!material) return null;

      let distanceKm: number | null = null;

      if (
        input.latitude != null &&
        input.longitude != null &&
        recycler.facilityLatitude != null &&
        recycler.facilityLongitude != null
      ) {
        distanceKm = calculateDistance(
          input.latitude,
          input.longitude,
          recycler.facilityLatitude,
          recycler.facilityLongitude,
        );

        if (
          recycler.serviceRadiusKm != null &&
          distanceKm > recycler.serviceRadiusKm
        ) {
          return null;
        }
      }

      return {
        recyclerId: recycler.id,
        name: recycler.name,
        offeredRate: material.offeredRate,
        pickupAvailable: material.pickupAvailable && recycler.pickupAvailable,
        city: recycler.city,
        state: recycler.state,
        distanceKm,
        estimatedAmount: material.offeredRate,
      };
    })
    .filter(
      (recycler): recycler is NonNullable<typeof recycler> => recycler !== null,
    )
    .sort((a, b) => {
      // Higher rate first
      return b.offeredRate - a.offeredRate;
    });
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
