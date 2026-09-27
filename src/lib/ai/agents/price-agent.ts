import { openRouterChat } from "../openrouter";
import { PRICE_AGENT_PROMPT } from "../prompt";
import { PriceExplanationSchema, type PriceExplanation } from "../schema";

type PriceInput = {
  material: string;
  estimatedMin: number;
  estimatedMax: number;
  recentPrices: number[];
  recyclerQuotes: number[];
};

export async function explainPrice(
  input: PriceInput,
): Promise<PriceExplanation> {
  const response = await openRouterChat([
    {
      role: "system",
      content: PRICE_AGENT_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ]);

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from price agent");
  }

  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Invalid price agent JSON:", content);
    throw new Error("Price agent returned invalid JSON");
  }

  return PriceExplanationSchema.parse(parsed);
}
