// import {
//   PrismaClient,
//   AuthorizationStatus,
//   Language,
//   PriceSource,
// } from "@prisma/client/extension";

import { PrismaClient } from "@prisma/client/extension";
import {
  AuthorizationStatus,
  Language,
  PriceSource,
} from "../generated/prisma/enums";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ScrapSetu database...");

  // --------------------------------------------------
  // 1. MATERIALS
  // --------------------------------------------------

  const materials = [
    {
      category: "PCB",
      subcategory: "Computer PCB",
      description:
        "Printed circuit boards from computers and electronic devices",
    },
    {
      category: "PCB",
      subcategory: "Mobile PCB",
      description: "Printed circuit boards from mobile phones",
    },
    {
      category: "Cable",
      subcategory: "Copper Cable",
      description: "Insulated copper electrical and data cables",
    },
    {
      category: "Battery",
      subcategory: "Lithium-ion Battery",
      description: "Rechargeable lithium-ion batteries from electronic devices",
    },
    {
      category: "CRT",
      subcategory: "CRT Monitor",
      description: "Old CRT monitors and television displays",
    },
    {
      category: "LCD",
      subcategory: "LCD Display",
      description: "LCD screens and display panels",
    },
    {
      category: "Motor",
      subcategory: "Electric Motor",
      description: "Small electric motors recovered from electronic equipment",
    },
    {
      category: "Magnet",
      subcategory: "Permanent Magnet",
      description: "Permanent magnets recovered from motors and electronics",
    },
    {
      category: "Mixed Plastic",
      subcategory: "Electronic Plastic",
      description: "Plastic components recovered from electronic equipment",
    },
    {
      category: "Metal",
      subcategory: "Aluminium",
      description: "Aluminium components recovered from electronic equipment",
    },
  ];

  const materialMap = new Map<string, string>();

  for (const material of materials) {
    const created = await prisma.material.upsert({
      where: {
        id: `${material.category}-${material.subcategory}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
      },
      update: {
        description: material.description,
      },
      create: {
        id: `${material.category}-${material.subcategory}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
        category: material.category,
        subcategory: material.subcategory,
        description: material.description,
        unit: "kg",
      },
    });

    materialMap.set(`${material.category}:${material.subcategory}`, created.id);
  }

  // --------------------------------------------------
  // 2. COLLECTOR
  // --------------------------------------------------

  const collector = await prisma.collector.upsert({
    where: {
      id: "demo-collector",
    },
    update: {},
    create: {
      id: "demo-collector",
      preferredLanguage: Language.HI,
      operatingArea: "Delhi",
    },
  });

  console.log(`👤 Collector created: ${collector.id}`);

  // --------------------------------------------------
  // 3. RECYCLERS
  // --------------------------------------------------

  const recyclers = [
    {
      id: "recycler-delhi-1",
      name: "GreenCycle Recycling",
      city: "Delhi",
      state: "Delhi",
      address: "Okhla Industrial Area, New Delhi",
      latitude: 28.5355,
      longitude: 77.2732,
      authorizationNumber: "EWASTE-DEL-001",
      serviceRadiusKm: 35,
      pickupAvailable: true,
    },
    {
      id: "recycler-delhi-2",
      name: "EcoTech Recyclers",
      city: "Delhi",
      state: "Delhi",
      address: "Bawana Industrial Area, Delhi",
      latitude: 28.7982,
      longitude: 77.0482,
      authorizationNumber: "EWASTE-DEL-002",
      serviceRadiusKm: 25,
      pickupAvailable: true,
    },
    {
      id: "recycler-noida-1",
      name: "Circular E-Waste Solutions",
      city: "Noida",
      state: "Uttar Pradesh",
      address: "Sector 63, Noida",
      latitude: 28.627,
      longitude: 77.391,
      authorizationNumber: "EWASTE-UP-001",
      serviceRadiusKm: 40,
      pickupAvailable: true,
    },
    {
      id: "recycler-gurgaon-1",
      name: "Reclaim Electronics",
      city: "Gurugram",
      state: "Haryana",
      address: "Udyog Vihar, Gurugram",
      latitude: 28.505,
      longitude: 77.09,
      authorizationNumber: "EWASTE-HR-001",
      serviceRadiusKm: 30,
      pickupAvailable: false,
    },
  ];

  for (const recycler of recyclers) {
    await prisma.recycler.upsert({
      where: {
        id: recycler.id,
      },
      update: {},
      create: {
        id: recycler.id,
        name: recycler.name,

        facilityLatitude: recycler.latitude,
        facilityLongitude: recycler.longitude,

        address: recycler.address,
        city: recycler.city,
        state: recycler.state,

        authorizationNumber: recycler.authorizationNumber,
        authorizationStatus: AuthorizationStatus.VERIFIED,

        phone: "9999999999",
        email: `contact@${recycler.id}.example`,

        pickupAvailable: recycler.pickupAvailable,
        serviceRadiusKm: recycler.serviceRadiusKm,
      },
    });
  }

  console.log(`♻️ ${recyclers.length} recyclers created`);

  // --------------------------------------------------
  // 4. RECYCLER MATERIAL RATES
  // --------------------------------------------------

  const recyclerRates = [
    // GreenCycle
    {
      recyclerId: "recycler-delhi-1",
      material: "PCB:Computer PCB",
      rate: 340,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-1",
      material: "PCB:Mobile PCB",
      rate: 900,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-1",
      material: "Cable:Copper Cable",
      rate: 520,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-1",
      material: "Battery:Lithium-ion Battery",
      rate: 180,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-1",
      material: "LCD:LCD Display",
      rate: 120,
      pickup: true,
    },

    // EcoTech
    {
      recyclerId: "recycler-delhi-2",
      material: "PCB:Computer PCB",
      rate: 360,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-2",
      material: "PCB:Mobile PCB",
      rate: 850,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-2",
      material: "Cable:Copper Cable",
      rate: 500,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-2",
      material: "Battery:Lithium-ion Battery",
      rate: 200,
      pickup: true,
    },
    {
      recyclerId: "recycler-delhi-2",
      material: "Motor:Electric Motor",
      rate: 250,
      pickup: true,
    },

    // Circular E-Waste
    {
      recyclerId: "recycler-noida-1",
      material: "PCB:Computer PCB",
      rate: 375,
      pickup: true,
    },
    {
      recyclerId: "recycler-noida-1",
      material: "Cable:Copper Cable",
      rate: 540,
      pickup: true,
    },
    {
      recyclerId: "recycler-noida-1",
      material: "LCD:LCD Display",
      rate: 130,
      pickup: true,
    },
    {
      recyclerId: "recycler-noida-1",
      material: "Motor:Electric Motor",
      rate: 270,
      pickup: true,
    },

    // Reclaim
    {
      recyclerId: "recycler-gurgaon-1",
      material: "PCB:Computer PCB",
      rate: 350,
      pickup: false,
    },
    {
      recyclerId: "recycler-gurgaon-1",
      material: "Cable:Copper Cable",
      rate: 560,
      pickup: false,
    },
    {
      recyclerId: "recycler-gurgaon-1",
      material: "Motor:Electric Motor",
      rate: 280,
      pickup: false,
    },
  ];

  for (const item of recyclerRates) {
    const materialId = materialMap.get(item.material);

    if (!materialId) {
      console.warn(`⚠️ Material not found: ${item.material}`);
      continue;
    }

    await prisma.recyclerMaterial.upsert({
      where: {
        recyclerId_materialId: {
          recyclerId: item.recyclerId,
          materialId,
        },
      },
      update: {
        offeredRate: item.rate,
        pickupAvailable: item.pickup,
      },
      create: {
        recyclerId: item.recyclerId,
        materialId,
        offeredRate: item.rate,
        unit: "kg",
        pickupAvailable: item.pickup,
      },
    });
  }

  console.log("💰 Recycler rates added");

  // --------------------------------------------------
  // 5. HISTORICAL PRICE DATA
  // --------------------------------------------------

  const historicalPrices = [
    {
      material: "PCB:Computer PCB",
      city: "Delhi",
      prices: [310, 325, 340, 335, 350, 360],
    },
    {
      material: "PCB:Mobile PCB",
      city: "Delhi",
      prices: [820, 850, 875, 900, 920],
    },
    {
      material: "Cable:Copper Cable",
      city: "Delhi",
      prices: [470, 490, 510, 520, 535, 550],
    },
    {
      material: "Battery:Lithium-ion Battery",
      city: "Delhi",
      prices: [150, 165, 180, 190, 200],
    },
    {
      material: "LCD:LCD Display",
      city: "Delhi",
      prices: [90, 105, 115, 120, 130],
    },
    {
      material: "Motor:Electric Motor",
      city: "Delhi",
      prices: [210, 225, 240, 255, 270],
    },
  ];

  for (const record of historicalPrices) {
    const materialId = materialMap.get(record.material);

    if (!materialId) continue;

    for (let i = 0; i < record.prices.length; i++) {
      const daysAgo = (record.prices.length - i) * 7;

      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - daysAgo);

      await prisma.priceRecord.create({
        data: {
          materialId,

          location: record.city,
          city: record.city,
          state: "Delhi",

          buyingPrice: record.prices[i],
          unit: "kg",

          sourceType:
            i % 2 === 0
              ? PriceSource.RECYCLER_QUOTE
              : PriceSource.FIELD_RESEARCH,

          recordedAt,
        },
      });
    }
  }

  console.log("📈 Historical price data added");

  console.log("✅ ScrapSetu seed completed!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
