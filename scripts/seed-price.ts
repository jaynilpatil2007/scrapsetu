import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

const PRICE_MAP: Record<string, number> = {
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

  console.log(`Found ${materials.length} materials`);

  for (const material of materials) {
    const key = material.category.toUpperCase();

    const price = PRICE_MAP[key] ?? 75;

    // Create 3 historical records with slightly different prices
    const prices = [Math.round(price * 0.9), price, Math.round(price * 1.1)];

    for (const buyingPrice of prices) {
      await prisma.priceRecord.create({
        data: {
          materialId: material.id,
          buyingPrice,
          sellingPrice: Math.round(buyingPrice * 1.15),
          unit: material.unit,
          sourceType: "FIELD_RESEARCH",
          location: "Delhi",
          city: "Delhi",
          state: "Delhi",
        },
      });
    }

    console.log(
      `✓ ${material.category} / ${material.subcategory ?? "-"} → ₹${prices[0]}-₹${prices[2]}/kg`,
    );
  }

  console.log("✅ Price records seeded");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
