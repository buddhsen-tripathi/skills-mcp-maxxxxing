import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { battleModels } from "@/lib/battle-models";
import { buildSkillSystemPrompt, loadSkillContent } from "@/lib/battle-skill-loader";
import { readCatalog } from "@/lib/storage";

export const maxDuration = 60;

const allowedModels = new Set(battleModels.map((m) => m.id));

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    toolId?: string;
    model?: string;
  };

  const { messages, toolId, model } = body;

  if (!toolId || !messages?.length) {
    return Response.json({ error: "toolId and messages are required" }, { status: 400 });
  }

  const catalog = await readCatalog();
  const tool = catalog.items.find((item) => item.id === toolId);
  if (!tool) {
    return Response.json({ error: "Tool not found" }, { status: 404 });
  }

  if (tool.kind !== "skill") {
    return Response.json({ error: "Battle chat only supports skills" }, { status: 400 });
  }

  const selectedModel = model && allowedModels.has(model as (typeof battleModels)[number]["id"])
    ? model
    : "openai/gpt-5.4-mini";

  const skill = await loadSkillContent(tool, { install: true });

  const result = streamText({
    model: selectedModel,
    system: buildSkillSystemPrompt(tool, skill.content),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2500,
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Skill-Source": skill.source,
      ...(skill.path ? { "X-Skill-Path": skill.path } : {}),
    },
  });
}
