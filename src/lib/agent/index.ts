import type { AgentAction, AgentResponse, Catalog } from "@/lib/types";

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

export function answerDirectoryQuery(query: string, catalog: Catalog): AgentResponse {
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
        .filter((tag) => !["awesome-list", "agentic", "github", "query-1", "query-2"].includes(tag)),
    ),
  ).slice(0, 8);

  return {
    query,
    intent,
    summary: buildSummary(query, plan, hadStrongMatch),
    plan,
    recommended,
    relatedTags,
    handoff: buildHandoff(query, plan),
    actions: toActions(plan),
  };
}
