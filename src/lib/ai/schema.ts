import { z } from "zod";

export const MaterialAnalysisSchema = z.object({
  category: z.string(),
  subcategory: z.string(),
  condition: z.string(),
  confidence: z.number().min(0).max(1),
  hazards: z.array(z.string()),
  recyclableMaterials: z.array(z.string()),
  explanation: z.string(),
});

export type MaterialAnalysis = z.infer<typeof MaterialAnalysisSchema>;

export const PriceExplanationSchema = z.object({
  explanation: z.string(),
  factors: z.array(z.string()),
  recommendation: z.string(),
});

export type PriceExplanation = z.infer<typeof PriceExplanationSchema>;

export const SafetyResponseSchema = z.object({
  title: z.string(),
  warnings: z.array(z.string()),
  steps: z.array(z.string()),
  emergencyAdvice: z.string(),
});

export type SafetyResponse = z.infer<typeof SafetyResponseSchema>;
