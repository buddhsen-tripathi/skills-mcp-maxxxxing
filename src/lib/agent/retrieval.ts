import { entrySummary } from "@/lib/display";
import type { AgentIntent, Catalog, DirectoryEntry } from "@/lib/types";

import { tokenizeQuery } from "./intent";

const SYNONYMS: Record<string, string[]> = {
  browser: ["playwright", "puppeteer", "e2e", "automation"],
  auth: ["oauth", "login", "session", "clerk"],
  ui: ["component", "design", "tailwind", "shadcn"],
  test: ["testing", "e2e", "jest", "vitest"],
  ai: ["llm", "agent", "gpt", "claude"],
};

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    expanded.add(token);
    for (const [key, values] of Object.entries(SYNONYMS)) {
      if (token === key || values.includes(token)) {
        expanded.add(key);
        for (const value of values) expanded.add(value);
      }
    }
  }
  return Array.from(expanded);
}

function scoreEntry(entry: DirectoryEntry, tokens: string[], intent: AgentIntent): number {
  const summary = entrySummary(entry).toLowerCase();
  const corpus = `${entry.name} ${summary} ${entry.tags.join(" ")} ${entry.kind}`.toLowerCase();
  let score = 0;

  if (intent.kinds.includes(entry.kind)) score += 8;

  for (const stackItem of intent.stack) {
    if (corpus.includes(stackItem)) score += 6;
  }

  for (const token of tokens) {
    if (entry.kind === token) score += 6;
    if (entry.tags.some((tag) => tag.includes(token))) score += 4;
    if (entry.name.toLowerCase().includes(token)) score += 3;
    if (summary.includes(token)) score += 2;
    if (corpus.includes(token)) score += 1;
  }

  if (entry.metadata.stars && entry.metadata.stars > 500) score += 2;
  if (entry.links.llmsTxt || entry.links.designMd) score += 1;

  return score;
}

export function retrieveEntries(query: string, catalog: Catalog, intent: AgentIntent, limit = 8): DirectoryEntry[] {
  const tokens = expandTokens(tokenizeQuery(query));

  const ranked = catalog.items
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, intent) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return catalog.items
      .slice()
      .sort((a, b) => (b.metadata.stars ?? 0) - (a.metadata.stars ?? 0))
      .slice(0, limit);
  }

  const picked: DirectoryEntry[] = [];
  const seenKind = new Set<string>();

  for (const { entry } of ranked) {
    if (picked.length >= limit) break;
    picked.push(entry);
    seenKind.add(entry.kind);
  }

  for (const { entry } of ranked) {
    if (picked.length >= limit) break;
    if (!seenKind.has(entry.kind) && intent.kinds.includes(entry.kind)) {
      picked.push(entry);
      seenKind.add(entry.kind);
    }
  }

  for (const { entry } of ranked) {
    if (picked.length >= limit) break;
    if (!picked.some((p) => p.id === entry.id)) picked.push(entry);
  }

  return picked.slice(0, limit);
}
