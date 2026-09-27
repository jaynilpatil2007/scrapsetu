import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMaterial } from "@/lib/ai/agents/material-agent";

const RequestSchema = z.object({
  imageUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { imageUrl } = RequestSchema.parse(body);

    const result = await analyzeMaterial(imageUrl);
    console.log(result.condition);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Material classification error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze material",
      },
      { status: 500 },
    );
  }
}
