import { OpenRouter } from "@openrouter/sdk";

export const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AI_MODEL = "dots-studio/dots-3-note-preview:free";

export async function openRouterChat(
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: unknown;
  }>,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ScrapSetu",
    },

    body: JSON.stringify({
      model: AI_MODEL,
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter API error:", data);

    throw new Error(
      data?.error?.message || `OpenRouter request failed: ${response.status}`,
    );
  }

  return data;
}
