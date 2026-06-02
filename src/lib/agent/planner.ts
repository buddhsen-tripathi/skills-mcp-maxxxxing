import { entrySummary } from "@/lib/display";
import type { AgentIntent, AgentPlanStep, DirectoryEntry } from "@/lib/types";

function whyThisTool(entry: DirectoryEntry, intent: AgentIntent): string {
  const summary = entrySummary(entry);
  const matchedStack = intent.stack.filter((s) => summary.toLowerCase().includes(s) || entry.tags.includes(s));
  const matchedTopic = intent.topics.find(
    (t) => entry.name.toLowerCase().includes(t) || entry.tags.some((tag) => tag.includes(t)),
  );

  if (matchedStack.length > 0) {
    return `Fits your ${matchedStack.join(", ")} stack. ${summary.slice(0, 120)}${summary.length > 120 ? "…" : ""}`;
  }
  if (matchedTopic) {
    return `Matches "${matchedTopic}" in your request. ${summary.slice(0, 120)}${summary.length > 120 ? "…" : ""}`;
  }
  if (entry.kind === "mcp") return `Adds agent tooling via MCP. ${summary.slice(0, 100)}${summary.length > 100 ? "…" : ""}`;
  if (entry.kind === "skill") return `Reusable skill for your coding agent. ${summary.slice(0, 100)}${summary.length > 100 ? "…" : ""}`;
  return `Supports your build workflow. ${summary.slice(0, 100)}${summary.length > 100 ? "…" : ""}`;
}

export function buildPlan(query: string, entries: DirectoryEntry[], intent: AgentIntent): AgentPlanStep[] {
  return entries.slice(0, 5).map((entry) => ({
    entryId: entry.id,
    name: entry.name,
    kind: entry.kind,
    why: whyThisTool(entry, intent),
    command: entry.install.command,
    agentPrompt: entry.install.agentPrompt,
  }));
}

export function buildHandoff(query: string, plan: AgentPlanStep[]): string {
  const lines = [
    `# Tool setup plan`,
    ``,
    `User goal: ${query}`,
    ``,
    `Implement the following tools in order. Validate each step before moving on.`,
    ``,
  ];

  plan.forEach((step, index) => {
    lines.push(`## ${index + 1}. ${step.name} (${step.kind})`);
    lines.push(`Why: ${step.why}`);
    if (step.command) {
      lines.push(`Run:`);
      lines.push("```bash");
      lines.push(step.command);
      lines.push("```");
    } else {
      lines.push(`Setup: follow repository documentation (no verified one-line install).`);
    }
    lines.push(`Task:`);
    lines.push(step.agentPrompt);
    lines.push("");
  });

  lines.push(`## Commands only`);
  plan.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.command ?? `(manual) ${step.name}`}`);
  });

  return lines.join("\n");
}

export function buildSummary(query: string, plan: AgentPlanStep[], hadStrongMatch: boolean): string {
  if (!hadStrongMatch) {
    return `No tight match for "${query}". Showing popular tools you can adapt. Refine your search with stack names (Next.js, Playwright, auth).`;
  }

  const kinds = Array.from(new Set(plan.map((p) => p.kind)));
  return `Suggested ${plan.length} tools across ${kinds.join(", ")}. Copy the full handoff below into Cursor, Claude Code, or your agent of choice.`;
}
