import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { battleModels } from "@/lib/battle-models";
import { buildSkillSystemPrompt, loadSkillContent } from "@/lib/battle-skill-loader";
import { readCatalog } from "@/lib/storage";

export const maxDuration = 60;

const allowedModels = new Set(battleModels.map((m) => m.id));
const MAX_CUSTOM_SKILL_BYTES = 120_000;

type CustomSkillPayload = {
  name?: string;
  content?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    toolId?: string;
    model?: string;
    customSkill?: CustomSkillPayload;
  };

  const { messages, toolId, model, customSkill } = body;

  if (!messages?.length) {
    return Response.json({ error: "messages are required" }, { status: 400 });
  }

  const customContent = customSkill?.content?.trim();
  const usingCustomSkill = Boolean(customContent);

  if (!usingCustomSkill && !toolId) {
    return Response.json({ error: "toolId or customSkill.content is required" }, { status: 400 });
  }

  if (usingCustomSkill && customContent!.length > MAX_CUSTOM_SKILL_BYTES) {
    return Response.json({ error: "Custom skill exceeds size limit" }, { status: 400 });
  }

  let skillName = customSkill?.name?.trim() || "Pasted megaskill";
  let skillContent = customContent ?? "";
  let skillSource = "custom";
  let skillPath: string | null = null;

  if (!usingCustomSkill) {
    const catalog = await readCatalog();
    const tool = catalog.items.find((item) => item.id === toolId);
    if (!tool) {
      return Response.json({ error: "Tool not found" }, { status: 404 });
    }

    if (tool.kind !== "skill") {
      return Response.json({ error: "Battle chat only supports skills" }, { status: 400 });
    }

    const loaded = await loadSkillContent(tool, { install: true });
    skillName = tool.name;
    skillContent = loaded.content;
    skillSource = loaded.source;
    skillPath = loaded.path;
  }

  const selectedModel = model && allowedModels.has(model as (typeof battleModels)[number]["id"])
    ? model
    : "openai/gpt-5.4-mini";

  const result = streamText({
    model: selectedModel,
    system: buildSkillSystemPrompt({ name: skillName }, skillContent),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2500,
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Skill-Source": skillSource,
      ...(skillPath ? { "X-Skill-Path": skillPath } : {}),
    },
  });
}
