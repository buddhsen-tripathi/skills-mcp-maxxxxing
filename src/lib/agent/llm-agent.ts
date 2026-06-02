import { generateObject } from "ai";

import { llmSelectionSchema } from "@/lib/agent/llm-selection-schema";
import { parseIntent } from "@/lib/agent/intent";
import { buildMegaskillWithLlm } from "@/lib/agent/megaskill";
import { buildHandoff, buildPlan } from "@/lib/agent/planner";
import { retrieveEntries } from "@/lib/agent/retrieval";
import { createOpenRouterClient, getOpenRouterConfig } from "@/lib/openrouter";
import type { AgentAction, AgentResponse, Catalog, DirectoryEntry } from "@/lib/types";

function toCandidatePayload(entries: DirectoryEntry[]) {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    summary: entry.summary,
    tags: entry.tags.slice(0, 8),
    command: entry.install.command,
    stars: entry.metadata.stars ?? null,
    repo: entry.source.repo ?? null,
  }));
}

function toActions(plan: ReturnType<typeof buildPlan>): AgentAction[] {
  return plan.map((step) => ({
    name: step.name,
    command: step.command,
    agentPrompt: step.agentPrompt,
  }));
}

function buildPlanFromLlmPicks(
  picks: { id: string; why: string }[],
  byId: Map<string, DirectoryEntry>,
): ReturnType<typeof buildPlan> {
  return picks
    .map((pick) => {
      const entry = byId.get(pick.id);
      if (!entry) return null;
      return {
        entryId: entry.id,
        name: entry.name,
        kind: entry.kind,
        why: pick.why,
        command: entry.install.command,
        agentPrompt: entry.install.agentPrompt,
      };
    })
    .filter((step): step is NonNullable<typeof step> => step !== null);
}

export async function answerDirectoryQueryWithLlm(query: string, catalog: Catalog): Promise<AgentResponse> {
  const config = getOpenRouterConfig();
  const intent = parseIntent(query);
  const candidates = retrieveEntries(query, catalog, intent, 28);
  const byId = new Map(candidates.map((entry) => [entry.id, entry]));

  const openrouter = createOpenRouterClient();
  const model = openrouter(config.model);

  const { object } = await generateObject({
    model,
    schema: llmSelectionSchema,
    system: `You advise developers on skills, MCP servers, and plugins for AI-assisted coding.

Rules:
- Only recommend tools from the provided catalog candidates (use exact "id" values).
- Prefer a small, coherent stack (3-6 tools) that directly solves the user's goal.
- Mix kinds when useful: MCP for integrations, skills for agent workflows, plugins for app tooling.
- Mention install practicality: prefer entries with a real "command" when possible.
- Write plain, direct copy. No em dashes.`,
    prompt: `User goal:\n${query}\n\nDetected intent:\n${JSON.stringify(intent, null, 2)}\n\nCatalog candidates (JSON):\n${JSON.stringify(toCandidatePayload(candidates), null, 2)}`,
    temperature: 0.2,
  });

  const recommended = object.picks
    .map((pick) => byId.get(pick.id))
    .filter((entry): entry is DirectoryEntry => Boolean(entry));

  const plan = buildPlanFromLlmPicks(object.picks, byId);
  const finalRecommended = recommended.length > 0 ? recommended : candidates.slice(0, 5);
  const finalPlan = plan.length > 0 ? plan : buildPlan(query, finalRecommended, intent);

  const relatedTags = Array.from(
    new Set(
      finalRecommended
        .flatMap((item) => item.tags)
        .filter((tag) => !["awesome-list", "agentic", "github", "curated-list"].includes(tag)),
    ),
  ).slice(0, 8);

  const megaskill = await buildMegaskillWithLlm(query, finalPlan, finalRecommended);

  return {
    query,
    intent,
    mode: "llm",
    summary: object.summary,
    plan: finalPlan,
    recommended: finalRecommended,
    relatedTags,
    handoff: buildHandoff(query, finalPlan),
    actions: toActions(finalPlan),
    megaskill,
  };
}
