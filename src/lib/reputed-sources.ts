import {
  collectEntries,
  fetchJson,
  fetchText,
  humanizeSlug,
  parseAwesomeMarkdown,
  rawEntry,
} from "@/lib/scraper-utils";
import type { DirectoryEntry } from "@/lib/types";

/** Max skills.sh entries per scrape (sitemaps list 10k+). */
const SKILLS_SH_LIMIT = Number(process.env.SCRAPE_SKILLS_SH_LIMIT ?? 1200);

/** Max official MCP registry servers per scrape. */
const MCP_REGISTRY_LIMIT = Number(process.env.SCRAPE_MCP_REGISTRY_LIMIT ?? 350);

const AWESOME_README_SOURCES: { url: string; tag: string }[] = [
  {
    url: "https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/README.md",
    tag: "getdesign-md",
  },
  {
    url: "https://raw.githubusercontent.com/heilcheng/awesome-agent-skills/main/README.md",
    tag: "agent-skill-co",
  },
  {
    url: "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md",
    tag: "awesome-claude-skills",
  },
  {
    url: "https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/main/README.md",
    tag: "composio-skills",
  },
];

const SKILLS_SH_SITEMAPS = [
  "https://www.skills.sh/sitemap-skills-1.xml",
  "https://www.skills.sh/sitemap-skills-2.xml",
];

type SkillsShRef = { owner: string; repo: string; skillId: string; pageUrl: string };

function parseSkillsShUrl(pageUrl: string): SkillsShRef | null {
  const match = /skills\.sh\/([^/]+)\/([^/]+)\/([^/?#]+)/i.exec(pageUrl);
  if (!match) return null;
  const [, owner, repo, skillId] = match;
  if (!owner || !repo || !skillId) return null;
  if (skillId === "skills" || repo === "skills") return null;
  return { owner, repo, skillId, pageUrl };
}

function skillsShEntry(ref: SkillsShRef): DirectoryEntry {
  const repo = `${ref.owner}/${ref.repo}`;
  const name = humanizeSlug(ref.skillId);
  const description = `Agent skill "${ref.skillId}" from ${repo} on skills.sh — install with the skills CLI.`;

  return rawEntry({
    name,
    kind: "skill",
    description,
    tags: ["skills-sh", "skill", "agent", ref.owner],
    author: ref.owner,
    url: ref.pageUrl,
    repo,
    docs: { readme: `https://github.com/${repo}` },
    sourceType: "website",
    install: {
      method: "npm",
      command: `npx skills add ${repo}`,
      agentPrompt: `Install the "${ref.skillId}" skill from ${repo} (skills.sh: ${ref.pageUrl}). Add to the project's skills folder and reference it in AGENTS.md.`,
    },
  });
}

/** skills.sh — Agent Skills Directory (sitemap; public API is Next-only). */
export async function scrapeSkillsSh(): Promise<DirectoryEntry[]> {
  const locs: string[] = [];

  const results = await Promise.allSettled(SKILLS_SH_SITEMAPS.map((url) => fetchText(url)));
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const match of result.value.matchAll(/<loc>(https:\/\/www\.skills\.sh\/[^<]+)<\/loc>/gi)) {
      locs.push(match[1]);
    }
  }

  const seen = new Set<string>();
  const entries: DirectoryEntry[] = [];

  for (const loc of locs) {
    if (entries.length >= SKILLS_SH_LIMIT) break;
    const ref = parseSkillsShUrl(loc);
    if (!ref) continue;
    const key = `${ref.owner}/${ref.repo}/${ref.skillId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = skillsShEntry(ref);
    if (entry.summary.length >= 12) entries.push(entry);
  }

  return collectEntries(entries);
}

/** getdesign.md — DESIGN.md collection (awesome-design-md README). */
export async function scrapeGetDesignMd(): Promise<DirectoryEntry[]> {
  const text = await fetchText(AWESOME_README_SOURCES[0].url);
  const entries: DirectoryEntry[] = [];

  const lineRe =
    /^\s*[-*]\s+\[\*\*(.+?)\*\*\]\((https:\/\/getdesign\.md\/[^)]+)\)\s*[-–—]\s*(.+)$/;

  for (const line of text.split("\n")) {
    const match = lineRe.exec(line.trim());
    if (!match) continue;
    const [, name, designUrl, blurb] = match;
    const entry = rawEntry({
      name: `${name} DESIGN.md`,
      kind: "plugin",
      description: blurb.trim(),
      tags: ["getdesign-md", "design-md", "design", "agent"],
      url: designUrl,
      docs: { readme: designUrl, design: designUrl },
      sourceType: "website",
      install: {
        command: null,
        agentPrompt: `Download the DESIGN.md from ${designUrl} and place it in the project root (or docs/) as the visual reference for UI work. Tell the agent to follow its tokens and patterns.`,
      },
    });
    entries.push(entry);
  }

  return collectEntries(entries);
}

/** Curated awesome README lists (agent skills, Claude skills, etc.). */
export async function scrapeAwesomeReadmes(): Promise<DirectoryEntry[]> {
  const results = await Promise.allSettled(
    AWESOME_README_SOURCES.slice(1).map(({ url, tag }) =>
      fetchText(url).then((text) => parseAwesomeMarkdown(text, tag)),
    ),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<DirectoryEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

type McpRegistryPayload = {
  servers?: Array<{
    server?: {
      name?: string;
      title?: string;
      description?: string;
      version?: string;
      remotes?: Array<{ type?: string; url?: string }>;
    };
    _meta?: {
      "io.modelcontextprotocol.registry/official"?: { isLatest?: boolean };
    };
  }>;
  metadata?: { nextCursor?: string };
};

/** Official Model Context Protocol registry. */
export async function scrapeMcpRegistry(): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;

  while (entries.length < MCP_REGISTRY_LIMIT && pages < 40) {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);

    const data = await fetchJson<McpRegistryPayload>(
      `https://registry.modelcontextprotocol.io/v0/servers?${params}`,
    );

    for (const row of data.servers ?? []) {
      if (entries.length >= MCP_REGISTRY_LIMIT) break;
      const official = row._meta?.["io.modelcontextprotocol.registry/official"];
      if (official?.isLatest === false) continue;

      const server = row.server;
      if (!server?.name || !server.description) continue;

      const key = server.name;
      if (seen.has(key)) continue;
      seen.add(key);

      const remote = server.remotes?.find((r) => r.url)?.url;
      const title = server.title ?? humanizeSlug(server.name.split("/").pop() ?? server.name);
      const registryUrl = `https://registry.modelcontextprotocol.io/v0/servers/${encodeURIComponent(server.name)}`;

      const entry = rawEntry({
        name: title.slice(0, 120),
        kind: "mcp",
        description: server.description.trim(),
        tags: ["mcp-registry", "mcp", "official"],
        url: registryUrl,
        docs: { readme: registryUrl },
        sourceType: "website",
        install: {
          command: remote ? null : null,
          agentPrompt: remote
            ? `Register the ${title} MCP server (${server.name}) using remote URL ${remote}. See ${registryUrl} for transport details.`
            : `Install ${title} from the official MCP registry (${registryUrl}) and add it to the agent MCP config.`,
        },
      });
      entries.push(entry);
    }

    cursor = data.metadata?.nextCursor;
    if (!cursor) break;
    pages += 1;
  }

  return collectEntries(entries);
}

export async function scrapeAllReputedSources(): Promise<DirectoryEntry[]> {
  const tasks = [
    scrapeSkillsSh(),
    scrapeGetDesignMd(),
    scrapeAwesomeReadmes(),
    scrapeMcpRegistry(),
  ];

  const settled = await Promise.allSettled(tasks);
  const labels = ["skills.sh", "getdesign.md", "awesome-readmes", "mcp-registry"];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "rejected") {
      console.warn(`[scrape] ${labels[i]} failed:`, result.reason);
    } else {
      console.warn(`[scrape] ${labels[i]}: ${result.value.length} entries`);
    }
  }

  return settled
    .filter((r): r is PromiseFulfilledResult<DirectoryEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}
