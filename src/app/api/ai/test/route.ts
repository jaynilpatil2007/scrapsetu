import { NextResponse } from "next/server";
import { openRouterChat, AI_MODEL } from "@/lib/ai/openrouter";

export async function GET() {
  try {
    const response = await openRouterChat([
      {
        role: "user",
        content: "Reply with exactly: ScrapSetu AI is working!",
      },
    ]);

    return NextResponse.json({
      success: true,
      model: AI_MODEL,
      response: response.choices?.[0]?.message?.content,
    });
  } catch (error) {
    console.error("OpenRouter error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
