import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: [
        {
          category: "asc",
        },
        {
          subcategory: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error) {
    console.error("Materials fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch materials",
      },
      { status: 500 },
    );
  }
}
