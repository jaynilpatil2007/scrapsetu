import { openRouterChat } from "@/lib/ai/openrouter";
import { MATERIAL_AGENT_PROMPT } from "@/lib/ai/prompt";
import { MaterialAnalysisSchema, type MaterialAnalysis } from "@/lib/ai/schema";

export async function analyzeMaterial(
  imageUrl: string,
): Promise<MaterialAnalysis> {
  console.log("IMAGE URL SENT TO LLM:", imageUrl);
  const response = await openRouterChat([
    {
      role: "system",
      content: MATERIAL_AGENT_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze the e-waste image provided below. Return only the requested JSON.",
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        },
      ],
    },
  ]);

  console.log("OPENROUTER RESPONSE MODEL:", response.model);

  const content = response.choices?.[0]?.message?.content;

  console.log("========== AI RESPONSE ==========");
  console.log(content);
  console.log("=================================");

  if (!content) {
    throw new Error("Material agent returned empty response");
  }

  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Invalid AI JSON:", content);
    throw new Error("Material agent returned invalid JSON");
  }

  // Convert model's field names into our internal schema.
  if (typeof parsed === "object" && parsed !== null) {
    const data = parsed as Record<string, unknown>;

    parsed = {
      category: data.material_category,
      subcategory: data.material_subcategory,
      condition: data.physical_condition,
      confidence: data.confidence,
      hazards: data.possible_hazards,
      recyclableMaterials: data.recyclable_materials,
      explanation: data.notes,
    };
  }

  return MaterialAnalysisSchema.parse(parsed);
}
