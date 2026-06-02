import { inferKind, isQualityEntry, normalizeEntry } from "@/lib/catalog-normalize";
import type { DirectoryEntry, EntryKind, LegacyDirectoryEntry } from "@/lib/types";

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "skills-mcp-maxxxxing/0.1 (+https://github.com)" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Failed fetch ${url}: ${response.status}`);
  return response.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "skills-mcp-maxxxxing/0.1",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Failed fetch ${url}: ${response.status}`);
  return response.json() as Promise<T>;
}

export function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function rawEntry(partial: {
  name: string;
  kind: EntryKind;
  description: string;
  tags: string[];
  author?: string;
  stars?: number;
  url?: string;
  repo?: string;
  docs?: LegacyDirectoryEntry["docs"];
  install?: LegacyDirectoryEntry["install"];
  sourceType?: LegacyDirectoryEntry["source"]["type"];
}): DirectoryEntry {
  const legacy: LegacyDirectoryEntry = {
    id: "",
    slug: "",
    name: partial.name,
    kind: partial.kind,
    description: partial.description,
    tags: partial.tags,
    author: partial.author,
    stars: partial.stars,
    docs: partial.docs,
    install: partial.install ?? { command: null, agentPrompt: "" },
    source: {
      type: partial.sourceType ?? (partial.repo || partial.url?.includes("github.com") ? "github" : partial.url ? "website" : "manual"),
      url: partial.url,
      repo: partial.repo,
    },
    updatedAt: new Date().toISOString(),
  };
  return normalizeEntry(legacy);
}

export function collectEntries(entries: DirectoryEntry[]): DirectoryEntry[] {
  return entries.filter((entry) => isQualityEntry(entry));
}

export function parseAwesomeMarkdown(text: string, sourceTag: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*[-*]\s+\[(?:\*\*)?(.+?)(?:\*\*)?\]\((https?:\/\/[^)]+)\)\s*(?:[-–—:]\s*(.+))?$/.exec(line.trim());
    if (!match) continue;
    const [, name, link, descriptionRaw] = match;
    const description = descriptionRaw?.trim() || `Listed in ${sourceTag}.`;
    const kind = inferKind(name, description, [sourceTag]);
    const entry = rawEntry({
      name: name.replace(/\*\*/g, "").trim(),
      kind,
      description,
      tags: [sourceTag, kind],
      url: link,
      docs: {
        readme: link,
        llms: /llms\.txt/i.test(line) ? link : undefined,
        design: /design\.md|getdesign\.md/i.test(line) ? link : undefined,
      },
    });
    if (isQualityEntry(entry)) entries.push(entry);
  }
  return entries;
}
