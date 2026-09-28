import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const materialId = "cmuke9pd700003ouinmfbt6ds";

  await prisma.priceRecord.createMany({
    data: [
      {
        materialId,
        location: "Delhi",
        city: "Delhi",
        state: "Delhi",
        buyingPrice: 420,
        sellingPrice: 500,
        unit: "kg",
        sourceType: "FIELD_RESEARCH",
      },
      {
        materialId,
        location: "Delhi",
        city: "Delhi",
        state: "Delhi",
        buyingPrice: 450,
        sellingPrice: 530,
        unit: "kg",
        sourceType: "RECYCLER_QUOTE",
      },
      {
        materialId,
        location: "Delhi",
        city: "Delhi",
        state: "Delhi",
        buyingPrice: 480,
        sellingPrice: 560,
        unit: "kg",
        sourceType: "COMPLETED_TRANSACTION",
      },
    ],
  });

  console.log("Price records seeded");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
