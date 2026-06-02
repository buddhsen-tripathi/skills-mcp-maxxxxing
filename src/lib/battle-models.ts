export const battleModels = [
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
  { id: "openai/gpt-5.1-thinking", label: "GPT-5.1 Thinking" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
] as const;

export type BattleModelId = (typeof battleModels)[number]["id"];

export const defaultBattleModels: [BattleModelId, BattleModelId] = ["openai/gpt-5.4-mini", "openai/gpt-5.4-mini"];
