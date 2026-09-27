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
    .map((recycler: { materials: any[]; id: any; name: any; pickupAvailable: any; city: any; state: any; }) => {
      const material = recycler.materials[0];

      return {
        recyclerId: recycler.id,
        name: recycler.name,
        offeredRate: material?.offeredRate ?? 0,
        pickupAvailable: material?.pickupAvailable ?? recycler.pickupAvailable,
        city: recycler.city,
        state: recycler.state,
      };
    })
    .sort((a: { offeredRate: number; }, b: { offeredRate: number; }) => b.offeredRate - a.offeredRate);
}
