import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const materialId = "cmuke9pd700003ouinmfbt6ds";

  const recyclers = await prisma.recycler.createMany({
    data: [
      {
        name: "Delhi Green Recycling",
        facilityLatitude: 28.6139,
        facilityLongitude: 77.209,
        address: "Okhla Industrial Area",
        city: "Delhi",
        state: "Delhi",
        authorizationNumber: "EWM-DEL-001",
        authorizationStatus: "VERIFIED",
        phone: "9876543210",
        email: "contact@delhigreen.example",
        pickupAvailable: true,
        serviceRadiusKm: 30,
      },
      {
        name: "EcoTech Recyclers",
        facilityLatitude: 28.5355,
        facilityLongitude: 77.391,
        address: "Noida Sector 63",
        city: "Noida",
        state: "Uttar Pradesh",
        authorizationNumber: "EWM-UP-002",
        authorizationStatus: "VERIFIED",
        phone: "9876543211",
        email: "contact@ecotech.example",
        pickupAvailable: true,
        serviceRadiusKm: 40,
      },
      {
        name: "Green Circuit Recycling",
        facilityLatitude: 28.4595,
        facilityLongitude: 77.0266,
        address: "Gurugram Industrial Area",
        city: "Gurugram",
        state: "Haryana",
        authorizationNumber: "EWM-HR-003",
        authorizationStatus: "VERIFIED",
        phone: "9876543212",
        email: "contact@greencircuit.example",
        pickupAvailable: true,
        serviceRadiusKm: 50,
      },
    ],
  });

  console.log(`Created ${recyclers.count} recyclers`);

  const createdRecyclers = await prisma.recycler.findMany({
    where: {
      authorizationNumber: {
        in: ["EWM-DEL-001", "EWM-UP-002", "EWM-HR-003"],
      },
    },
  });

  await prisma.recyclerMaterial.createMany({
    data: createdRecyclers.map((recycler) => ({
      recyclerId: recycler.id,
      materialId,
      offeredRate:
        recycler.name === "EcoTech Recyclers"
          ? 480
          : recycler.name === "Green Circuit Recycling"
            ? 450
            : 420,
      unit: "kg",
      minQuantity: 1,
      pickupAvailable: true,
    })),
  });

  console.log("Recycler material mappings created");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
