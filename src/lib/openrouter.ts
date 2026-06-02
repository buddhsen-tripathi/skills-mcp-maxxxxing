import { createOpenAI } from "@ai-sdk/openai";

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || "anthropic/claude-sonnet-4";

  return {
    apiKey,
    model,
    enabled: Boolean(apiKey),
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
    siteName: process.env.OPENROUTER_SITE_NAME?.trim() || "Skills MCP Directory",
  };
}

export function createOpenRouterClient() {
  const config = getOpenRouterConfig();
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.apiKey,
    headers: {
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.siteName,
    },
  });
}
