import type { AgentAction, AgentResponse, Catalog } from "@/lib/types";
import { getOpenRouterConfig } from "@/lib/openrouter";

import { buildMegaskillKeyword } from "./megaskill";
import { answerDirectoryQueryWithLlm } from "./llm-agent";
import { parseIntent } from "./intent";
import { buildHandoff, buildPlan, buildSummary } from "./planner";
import { retrieveEntries } from "./retrieval";

function toActions(plan: ReturnType<typeof buildPlan>): AgentAction[] {
  return plan.map((step) => ({
    name: step.name,
    command: step.command,
    agentPrompt: step.agentPrompt,
  }));
}

/** Keyword + rules fallback when OpenRouter is unavailable or errors. */
export function answerDirectoryQueryKeyword(query: string, catalog: Catalog): AgentResponse {
  const intent = parseIntent(query);
  const recommended = retrieveEntries(query, catalog, intent, 8);
  const plan = buildPlan(query, recommended, intent);

  const hadStrongMatch = recommended.some((entry) => {
    const hay = `${entry.name} ${entry.tags.join(" ")}`.toLowerCase();
    return intent.topics.some((t) => hay.includes(t)) || intent.stack.some((s) => hay.includes(s));
  });

  const relatedTags = Array.from(
    new Set(
      recommended
        .flatMap((item) => item.tags)
        .filter((tag) => !["awesome-list", "agentic", "github", "curated-list"].includes(tag)),
    ),
  ).slice(0, 8);

  const config = getOpenRouterConfig();
  const summaryPrefix = config.enabled ? "" : "Using keyword search from the catalog. ";

  return {
    query,
    intent,
    mode: "keyword",
    summary: summaryPrefix + buildSummary(query, plan, hadStrongMatch),
    plan,
    recommended,
    relatedTags,
    handoff: buildHandoff(query, plan),
    actions: toActions(plan),
    megaskill: buildMegaskillKeyword(query, plan),
  };
}

/** Primary agent: OpenRouter LLM when configured, otherwise keyword fallback. */
export async function answerDirectoryQuery(query: string, catalog: Catalog): Promise<AgentResponse> {
  const config = getOpenRouterConfig();
  if (!config.enabled) {
    return answerDirectoryQueryKeyword(query, catalog);
  }

  try {
    return await answerDirectoryQueryWithLlm(query, catalog);
  } catch (error) {
    console.error("[agent] OpenRouter failed, using keyword fallback:", error);
    const fallback = answerDirectoryQueryKeyword(query, catalog);
    return {
      ...fallback,
      summary: `The AI agent could not reach OpenRouter. Showing keyword matches instead.`,
    };
  }
}
