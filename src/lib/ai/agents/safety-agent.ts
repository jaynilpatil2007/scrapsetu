import { openRouterChat } from "../openrouter";
import { SAFETY_AGENT_PROMPT } from "../prompt";
import { SafetyResponseSchema, type SafetyResponse } from "../schema";

export async function getSafetyGuidance(
  material: string,
): Promise<SafetyResponse> {
  const response = await openRouterChat([
    {
      role: "system",
      content: SAFETY_AGENT_PROMPT,
    },
    {
      role: "user",
      content: `Give safety guidance for handling: ${material}`,
    },
  ]);

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from safety agent");
  }

  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Invalid safety agent JSON:", content);
    throw new Error("Safety agent returned invalid JSON");
  }

  return SafetyResponseSchema.parse(parsed);
}
