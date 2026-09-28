import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

const RATE_MAP: Record<string, number> = {
  PCB: 180,
  CABLE: 120,
  BATTERY: 90,
  CRT: 35,
  LCD: 80,
  MOTOR: 110,
  MAGNET: 150,
  "MIXED PLASTIC": 30,
  METAL: 55,
  COMPUTER: 100,
  MOBILE: 250,
};

async function main() {
  const materials = await prisma.material.findMany();
  const recyclers = await prisma.recycler.findMany({
    where: {
      authorizationStatus: "VERIFIED",
    },
  });

  console.log(`Materials: ${materials.length}`);
  console.log(`Verified recyclers: ${recyclers.length}`);

  if (recyclers.length === 0) {
    console.log("❌ No verified recyclers found.");
    return;
  }

  for (const recycler of recyclers) {
    for (const material of materials) {
      const key = material.category.toUpperCase();

      const offeredRate = RATE_MAP[key] ?? 75;

      await prisma.recyclerMaterial.upsert({
        where: {
          recyclerId_materialId: {
            recyclerId: recycler.id,
            materialId: material.id,
          },
        },
        update: {
          offeredRate,
          unit: material.unit,
          pickupAvailable: recycler.pickupAvailable,
        },
        create: {
          recyclerId: recycler.id,
          materialId: material.id,
          offeredRate,
          unit: material.unit,
          pickupAvailable: recycler.pickupAvailable,
        },
      });

      console.log(
        `✓ ${recycler.name} → ${material.category} → ₹${offeredRate}/${material.unit}`,
      );
    }
  }

  console.log("✅ RecyclerMaterial seeded");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });