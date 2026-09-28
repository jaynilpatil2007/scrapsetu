import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Seeding materials...");

  const materials = [
    {
      category: "PCB",
      subcategory: "Laptop Motherboard",
      description: "Electronic circuit boards from laptops and computers",
    },
    {
      category: "Battery",
      subcategory: "Lithium Ion",
      description: "Rechargeable lithium-ion batteries",
    },
    {
      category: "Cable",
      subcategory: "Copper Cable",
      description: "Electrical and data cables",
    },
    {
      category: "LCD",
      subcategory: "LCD Display",
      description: "LCD screens and display panels",
    },
    {
      category: "CRT",
      subcategory: "CRT Monitor",
      description: "Old CRT monitors and televisions",
    },
    {
      category: "Motor",
      subcategory: "Electric Motor",
      description: "Small electric motors from electronic equipment",
    },
    {
      category: "Magnet",
      subcategory: "Permanent Magnet",
      description: "Magnets recovered from motors and electronics",
    },
    {
      category: "Mixed Plastic",
      subcategory: "Electronic Plastic",
      description: "Plastic components from electronic devices",
    },
    {
      category: "Metal",
      subcategory: "Mixed Metal",
      description: "Metal components recovered from electronics",
    },
    {
      category: "Computer",
      subcategory: "Desktop Computer",
      description: "Complete desktop computer units",
    },
    {
      category: "Mobile",
      subcategory: "Mobile Phone",
      description: "Used mobile phones",
    },
  ];

  for (const material of materials) {
    await prisma.material.create({
      data: {
        ...material,
        unit: "kg",
      },
    });
  }

  console.log(`✅ ${materials.length} materials seeded successfully`);
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
