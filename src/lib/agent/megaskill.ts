import { generateObject } from "ai";

import { megaskillDraftSchema } from "@/lib/agent/megaskill-schema";
import { createOpenRouterClient, getOpenRouterConfig } from "@/lib/openrouter";
import type { AgentPlanStep, DirectoryEntry, Megaskill, MegaskillToolRef } from "@/lib/types";

function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function toolsFromPlan(plan: AgentPlanStep[]): MegaskillToolRef[] {
  return plan.map((step) => ({
    catalogId: step.entryId,
    name: step.name,
    kind: step.kind,
    role: step.why,
    command: step.command,
  }));
}

function buildInstallScript(tools: MegaskillToolRef[]): string {
  const lines = ["#!/usr/bin/env bash", "set -euo pipefail", ""];
  for (const tool of tools) {
    if (tool.command) {
      lines.push(`# ${tool.name} (${tool.kind})`);
      lines.push(tool.command);
      lines.push("");
    }
  }
  if (lines.length <= 3) {
    lines.push("# No one-line install commands found. Follow SKILL.md setup section per tool.");
  }
  return lines.join("\n");
}

export function renderSkillMarkdown(
  draft: {
    name: string;
    title: string;
    description: string;
    overview: string;
    whenToUse: string[];
    workflowSteps: { title: string; body: string; toolIds: string[] }[];
    verification: string[];
  },
  tools: MegaskillToolRef[],
  query: string,
): string {
  const toolById = new Map(tools.map((t) => [t.catalogId, t]));

  const whenLines = draft.whenToUse.map((w) => `- ${w}`).join("\n");
  const verifyLines = draft.verification.map((v) => `- ${v}`).join("\n");

  const workflow = draft.workflowSteps
    .map((step, index) => {
      const linked = step.toolIds
        .map((id) => toolById.get(id))
        .filter(Boolean)
        .map((t) => `**${t!.name}** (${t!.kind})`);
      const toolsLine = linked.length > 0 ? `\n\nTools: ${linked.join(", ")}` : "";
      return `### ${index + 1}. ${step.title}\n\n${step.body}${toolsLine}`;
    })
    .join("\n\n");

  const stackTable = tools
    .map(
      (t) =>
        `| ${t.name} | ${t.kind} | ${t.command ? `\`${t.command}\`` : "See repo docs"} | ${t.role} |`,
    )
    .join("\n");

  const installBlock = tools
    .filter((t) => t.command)
    .map((t) => `\`\`\`bash\n# ${t.name}\n${t.command}\n\`\`\``)
    .join("\n\n");

  return `---
name: ${draft.name}
description: ${draft.description}
disable-model-invocation: true
---

# ${draft.title}

${draft.overview}

Built from directory query: "${query}"

## When to use

${whenLines}

## Tool stack

| Tool | Kind | Install | Role |
| --- | --- | --- | --- |
${stackTable}

## Install

${installBlock || "Install each tool from its repository documentation linked in the tool stack."}

## Workflow

${workflow}

## Verify

${verifyLines}
`;
}

function buildMegaskillFromDraft(
  draft: {
    name: string;
    title: string;
    description: string;
    overview: string;
    whenToUse: string[];
    workflowSteps: { title: string; body: string; toolIds: string[] }[];
    verification: string[];
  },
  tools: MegaskillToolRef[],
  query: string,
): Megaskill {
  const name = slugifyName(draft.name);
  const skillMarkdown = renderSkillMarkdown(draft, tools, query);

  return {
    name,
    title: draft.title,
    description: draft.description,
    summary: draft.overview,
    whenToUse: draft.whenToUse,
    tools,
    installScript: buildInstallScript(tools),
    skillMarkdown,
    installPath: `.cursor/skills/${name}/SKILL.md`,
  };
}

/** Template megaskill when OpenRouter is unavailable. */
export function buildMegaskillKeyword(query: string, plan: AgentPlanStep[]): Megaskill {
  const tools = toolsFromPlan(plan);
  const name = slugifyName(`megaskill-${query.slice(0, 40)}`);

  const draft = {
    name,
    title: `Megaskill: ${query.slice(0, 60)}`,
    description: `Orchestrates ${tools.length} catalog tools for: ${query.slice(0, 200)}. Use when building this stack or when the user asks about this workflow.`,
    overview: `Composite skill that wires ${tools.map((t) => t.name).join(", ")} into one agent workflow for your goal.`,
    whenToUse: [
      `User is working on: ${query}`,
      "Setting up a new project with this tool stack",
      "Need a repeatable agent playbook for this workflow",
    ],
    workflowSteps: plan.map((step) => ({
      title: `Set up ${step.name}`,
      body: `${step.why}\n\nAgent task: ${step.agentPrompt}`,
      toolIds: [step.entryId],
    })),
    verification: [
      "Each tool installs without errors",
      "A minimal smoke test passes for the primary use case",
      "Document final setup in AGENTS.md or project README",
    ],
  };

  return buildMegaskillFromDraft(draft, tools, query);
}

export async function buildMegaskillWithLlm(
  query: string,
  plan: AgentPlanStep[],
  recommended: DirectoryEntry[],
): Promise<Megaskill> {
  const config = getOpenRouterConfig();
  if (!config.enabled) {
    return buildMegaskillKeyword(query, plan);
  }

  const tools = toolsFromPlan(plan);
  const openrouter = createOpenRouterClient();
  const model = openrouter(config.model);

  const toolPayload = recommended.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    summary: e.summary,
    command: e.install.command,
    tags: e.tags.slice(0, 6),
  }));

  try {
    const { object } = await generateObject({
      model,
      schema: megaskillDraftSchema,
      system: `You create "megaskills": composite Cursor Agent Skills (SKILL.md) that orchestrate multiple tools into one workflow.

Rules:
- Output a valid skill slug (lowercase, hyphens).
- Description must be third person, include WHAT and WHEN (for skill discovery).
- workflowSteps must reference catalog tool ids in toolIds when a step uses that tool.
- Be actionable: a coding agent should follow this without guessing.
- Plain language. No em dashes.`,
      prompt: `User goal:\n${query}\n\nSelected plan (JSON):\n${JSON.stringify(plan, null, 2)}\n\nCatalog tools (JSON):\n${JSON.stringify(toolPayload, null, 2)}`,
      temperature: 0.3,
    });

    return buildMegaskillFromDraft(object, tools, query);
  } catch (error) {
    console.error("[megaskill] LLM failed, using template:", error);
    return buildMegaskillKeyword(query, plan);
  }
}
