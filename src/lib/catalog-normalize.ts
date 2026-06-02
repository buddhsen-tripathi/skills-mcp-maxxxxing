import type { DirectoryEntry, EntryKind, LegacyDirectoryEntry } from "@/lib/types";

const MAX_SUMMARY = 200;
const MAX_DESCRIPTION = 400;

const BLOCKED_TAGS = new Set([
  "github",
  "agentic",
  "awesome-list",
  "directory",
  "query-1",
  "query-2",
  "query-3",
  "query-4",
  "query-5",
  "query-6",
  "query-7",
  "org-1",
  "org-2",
  "org-3",
]);

const VERIFIED_NPM_MCP: Record<string, string> = {
  playwright: "npx -y @modelcontextprotocol/server-playwright",
  puppeteer: "npx -y @modelcontextprotocol/server-puppeteer",
  filesystem: "npx -y @modelcontextprotocol/server-filesystem",
  github: "npx -y @modelcontextprotocol/server-github",
  postgres: "npx -y @modelcontextprotocol/server-postgres",
  sqlite: "npx -y @modelcontextprotocol/server-sqlite",
  brave: "npx -y @modelcontextprotocol/server-brave-search",
};

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripNoise(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function firstSentence(text: string): string {
  const clean = stripNoise(text);
  const parts = clean.split(/(?<=[.!?])\s+/);
  const first = parts[0] ?? clean;
  return first.length >= 12 ? first : clean;
}

function parseGitHubRepo(url?: string): string | undefined {
  if (!url) return undefined;
  const match = /github\.com\/([^/]+\/[^/#?]+)/i.exec(url);
  return match?.[1]?.replace(/\.git$/, "");
}

export function inferKind(name: string, description: string, tags: string[]): EntryKind {
  const hay = `${name} ${description} ${tags.join(" ")}`.toLowerCase();

  if (/\b(model context protocol|\bmcp\b|mcp-server)\b/.test(hay)) return "mcp";
  if (/\b(skills?|cursor rules|agent skill|prompt pack)\b/.test(hay)) return "skill";
  if (/\b(plugin|extension|ui kit|component library|sdk|framework)\b/.test(hay)) return "plugin";
  if (/\bcli\b/.test(hay) && !/\bmcp\b/.test(hay)) return "skill";

  return "plugin";
}

function cleanTags(tags: string[], kind: EntryKind): string[] {
  const normalized = tags
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length >= 2 && tag.length <= 40)
    .filter((tag) => !BLOCKED_TAGS.has(tag))
    .filter((tag) => !/^query-\d+$/.test(tag))
    .filter((tag) => !/^org-\d+$/.test(tag));

  const withKind = new Set<string>([kind, ...normalized]);
  return Array.from(withKind).slice(0, 8);
}

function buildSummary(description: string, legacyPurpose?: string): string {
  const purposeStripped = legacyPurpose
    ?.replace(
      /^(MCP integration for coding agents\.|Reusable agent skill for software workflows\.|Plugin\/tooling support for modern software delivery\.)\s*/i,
      "",
    )
    .trim();

  const base = stripNoise(description);
  const candidate =
    base.length >= 12 && !/^repository related to agentic/i.test(base)
      ? firstSentence(base)
      : firstSentence(purposeStripped ?? base);

  return truncate(candidate, MAX_SUMMARY);
}

function buildDescription(description: string, summary: string): string {
  const clean = stripNoise(description);
  if (clean.length >= 12 && clean !== summary && !/^repository related to agentic/i.test(clean)) {
    return truncate(clean, MAX_DESCRIPTION);
  }
  return summary;
}

function buildInstall(
  kind: EntryKind,
  name: string,
  slug: string,
  repo?: string,
  url?: string,
): DirectoryEntry["install"] {
  const docsUrl = url ?? (repo ? `https://github.com/${repo}` : undefined);
  const basePrompt = docsUrl
    ? `Set up ${name} using the official docs at ${docsUrl}. Document config and verify it works in this project.`
    : `Set up ${name} in this project and document how the team should use it.`;

  if (kind === "skill" && docsUrl?.includes("github.com")) {
    return {
      method: "git",
      command: `git clone ${docsUrl} .tools/skills/${slug}`,
      agentPrompt: `Clone ${name} into .tools/skills/${slug}, add usage notes to AGENTS.md, and wire it into our workflow.`,
    };
  }

  if (kind === "mcp") {
    const verified = VERIFIED_NPM_MCP[slug];
    if (verified) {
      return {
        method: "npm",
        command: verified,
        agentPrompt: `Install the ${name} MCP server, add it to the agent config, and run a smoke test.`,
      };
    }

    return {
      method: "manual",
      command: null,
      agentPrompt: `Follow the MCP setup guide for ${name}${docsUrl ? ` (${docsUrl})` : ""} and register the server in our agent config.`,
    };
  }

  if (slug === "shadcn-ui") {
    return {
      method: "npm",
      command: "bunx shadcn@latest init",
      agentPrompt: "Initialize shadcn/ui and add the primitives this app needs.",
    };
  }

  return {
    method: "manual",
    command: null,
    agentPrompt: basePrompt,
  };
}

function buildLinks(
  sourceType: DirectoryEntry["source"]["type"],
  url?: string,
  legacyDocs?: LegacyDirectoryEntry["docs"],
): DirectoryEntry["links"] {
  const repo = parseGitHubRepo(url);
  const links: DirectoryEntry["links"] = {};

  if (repo) {
    links.repository = `https://github.com/${repo}`;
    links.docs = legacyDocs?.readme ?? links.repository;
  } else if (url) {
    links.homepage = url;
    links.docs = legacyDocs?.readme ?? url;
  }

  if (legacyDocs?.llms) links.llmsTxt = legacyDocs.llms;
  if (legacyDocs?.design) links.designMd = legacyDocs.design;

  if (sourceType === "website" && url) {
    links.homepage = url;
    links.docs = legacyDocs?.readme ?? url;
  }

  return links;
}

export function normalizeEntry(raw: LegacyDirectoryEntry): DirectoryEntry {
  const slug = normalizeSlug(raw.slug || raw.name);
  const kind = raw.kind ?? inferKind(raw.name, raw.description, raw.tags);
  const repo = raw.source.repo ?? parseGitHubRepo(raw.source.url);
  const tags = cleanTags(raw.tags ?? [], kind);
  const summary = raw.summary ? truncate(stripNoise(raw.summary), MAX_SUMMARY) : buildSummary(raw.description, raw.purpose);
  const description = buildDescription(raw.description, summary);
  const url = raw.source.url ?? (repo ? `https://github.com/${repo}` : undefined);

  const install =
    raw.install?.method && raw.install.agentPrompt
      ? {
          method: raw.install.method,
          command: raw.install.command,
          agentPrompt: truncate(stripNoise(raw.install.agentPrompt), 500),
        }
      : buildInstall(kind, raw.name, slug, repo, url);

  if (install.method === "npm" && install.command?.includes("@modelcontextprotocol/server-") && !Object.values(VERIFIED_NPM_MCP).includes(install.command)) {
    const fixed = buildInstall(kind, raw.name, slug, repo, url);
    Object.assign(install, fixed);
  }

  return {
    id: raw.id || `${kind}-${slug}`,
    slug,
    name: stripNoise(raw.name).slice(0, 120),
    kind,
    summary,
    description,
    tags,
    metadata: {
      author: raw.metadata?.author ?? raw.author,
      stars: raw.metadata?.stars ?? raw.stars,
    },
    links: raw.links ?? buildLinks(raw.source.type, url, raw.docs),
    install,
    source: {
      type: raw.source.type,
      url,
      repo,
    },
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function isQualityEntry(entry: DirectoryEntry): boolean {
  const text = `${entry.name} ${entry.summary} ${entry.description}`.toLowerCase();

  if (entry.name.length < 2) return false;
  if (entry.summary.length < 12) return false;
  if (/^repository related to agentic/i.test(entry.description)) return false;

  const blocked = ["dictatorship", "propaganda", "nsfw", "malware", "ransomware", "casino"];
  if (blocked.some((term) => text.includes(term))) return false;

  const relevant = ["mcp", "agent", "skill", "plugin", "sdk", "llm", "coding", "developer", "cli", "automation", "ai", "tool"];
  const hasRelevance =
    relevant.some((term) => text.includes(term)) ||
    entry.tags.some((tag) => relevant.includes(tag) || tag === entry.kind);
  if (!hasRelevance) return false;

  if (entry.source.type === "github" && entry.metadata.stars !== undefined && entry.metadata.stars < 5) {
    return false;
  }

  if (/^awesome[- ](mcp|ai|prompt)/i.test(entry.name)) return false;

  return true;
}

export function normalizeCatalog(items: LegacyDirectoryEntry[]): DirectoryEntry[] {
  const bySlug = new Map<string, DirectoryEntry>();

  for (const raw of items) {
    try {
      const entry = normalizeEntry(raw);
      if (!isQualityEntry(entry)) continue;

      const existing = bySlug.get(entry.slug);
      if (!existing) {
        bySlug.set(entry.slug, entry);
        continue;
      }

      const existingScore = (existing.metadata.stars ?? 0) + existing.tags.length;
      const nextScore = (entry.metadata.stars ?? 0) + entry.tags.length;
      if (nextScore > existingScore) {
        bySlug.set(entry.slug, entry);
      }
    } catch {
      continue;
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    const starsDelta = (b.metadata.stars ?? 0) - (a.metadata.stars ?? 0);
    if (starsDelta !== 0) return starsDelta;
    return a.name.localeCompare(b.name);
  });
}
