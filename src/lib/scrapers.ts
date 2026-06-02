import { enrichCatalogInstalls } from "@/lib/enrich-installs";
import { inferKind, isQualityEntry, normalizeCatalog } from "@/lib/catalog-normalize";
import { scrapeAllReputedSources } from "@/lib/reputed-sources";
import { fetchText, parseAwesomeMarkdown, rawEntry } from "@/lib/scraper-utils";
import type { Catalog, DirectoryEntry, EntryKind, LegacyDirectoryEntry } from "@/lib/types";

async function fetchGitHubRepos(query: string, perPage: number) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "skills-mcp-maxxxxing",
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub search failed: ${response.status}`);
  const data = (await response.json()) as {
    items?: Array<{
      name: string;
      description: string | null;
      html_url: string;
      topics?: string[];
      stargazers_count: number;
      owner?: { login?: string };
    }>;
  };
  return data.items ?? [];
}

function reposToEntries(
  repos: Array<{
    name: string;
    description: string | null;
    html_url: string;
    topics?: string[];
    stargazers_count: number;
    owner?: { login?: string };
  }>,
): DirectoryEntry[] {
  return repos
    .map((repo) => {
      const description = repo.description?.trim();
      if (!description || description.length < 12) return null;
      const entry = rawEntry({
        name: repo.name,
        kind: inferKind(repo.name, description, repo.topics ?? []),
        description,
        tags: [...(repo.topics ?? []), "github-search"],
        author: repo.owner?.login,
        stars: repo.stargazers_count,
        url: repo.html_url,
        docs: { readme: repo.html_url },
      });
      return isQualityEntry(entry) ? entry : null;
    })
    .filter((entry): entry is DirectoryEntry => entry !== null);
}

async function scrapeAwesomeCollections(): Promise<DirectoryEntry[]> {
  const sources = [
    "https://raw.githubusercontent.com/e2b-dev/awesome-ai-agents/main/README.md",
    "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
    "https://raw.githubusercontent.com/ai-boost/awesome-prompts/main/README.md",
  ];

  const results = await Promise.allSettled(
    sources.map((url) => fetchText(url).then((t) => parseAwesomeMarkdown(t, "curated-list"))),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<DirectoryEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

async function scrapeGitHubSearchAgents(): Promise<DirectoryEntry[]> {
  const queries = [
    "mcp server language:typescript stars:>100",
    "cursor skill stars:>50",
    "llms.txt stars:>30",
    "ai coding agent sdk stars:>200",
  ];
  const results = await Promise.allSettled(queries.map((q) => fetchGitHubRepos(q, 25)));
  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => reposToEntries((r as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchGitHubRepos>>>).value));
}

async function scrapeCuratedMcpRepos(): Promise<DirectoryEntry[]> {
  const repos = ["modelcontextprotocol/servers", "punkpeye/awesome-mcp-servers"];
  const entries: DirectoryEntry[] = [];

  for (const repoPath of repos) {
    try {
      const data = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers: { "User-Agent": "skills-mcp-maxxxxing", Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(20_000),
      }).then(
        (res) =>
          res.json() as Promise<{
            name?: string;
            description?: string;
            html_url?: string;
            owner?: { login?: string };
            topics?: string[];
            stargazers_count?: number;
          }>,
      );

      const entry = rawEntry({
        name: data.name ?? repoPath.split("/")[1] ?? repoPath,
        kind: "mcp",
        description: data.description ?? "Curated collection of Model Context Protocol servers.",
        tags: ["mcp", "curated-list", ...(data.topics ?? [])],
        author: data.owner?.login,
        stars: data.stargazers_count,
        url: data.html_url ?? `https://github.com/${repoPath}`,
      });
      if (isQualityEntry(entry)) entries.push(entry);
    } catch {
      continue;
    }
  }

  return entries;
}

async function scrapeDesignSystemExamples(): Promise<DirectoryEntry[]> {
  const websites: Array<{ name: string; description: string; url: string; tags: string[]; kind?: EntryKind }> = [
    {
      name: "shadcn/ui",
      description: "Copy-paste React components built on Radix and Tailwind.",
      url: "https://ui.shadcn.com",
      tags: ["ui", "react", "components"],
    },
    {
      name: "Framer Motion",
      description: "Animation library for React.",
      url: "https://www.framer.com/motion/",
      tags: ["motion", "react"],
    },
    {
      name: "Tailwind CSS",
      description: "Utility-first CSS framework.",
      url: "https://tailwindcss.com",
      tags: ["css", "design"],
    },
    {
      name: "getdesign.md",
      description: "Browse DESIGN.md design-system analyses for AI coding agents.",
      url: "https://getdesign.md",
      tags: ["getdesign-md", "design-md", "design"],
      kind: "plugin",
    },
    {
      name: "skills.sh",
      description: "The open agent skills directory — discover and install skills for Cursor, Claude Code, Codex, and more.",
      url: "https://www.skills.sh",
      tags: ["skills-sh", "skill", "directory"],
      kind: "skill",
    },
  ];

  return websites.map((item) =>
    rawEntry({
      name: item.name,
      kind: item.kind ?? "plugin",
      description: item.description,
      tags: item.tags,
      url: item.url,
      docs: { readme: item.url, design: item.url.includes("getdesign") ? item.url : undefined },
    }),
  );
}

export async function runScraperAgents(existing: Catalog): Promise<Catalog> {
  const tasks = [
    scrapeAllReputedSources(),
    scrapeAwesomeCollections(),
    scrapeCuratedMcpRepos(),
    scrapeGitHubSearchAgents(),
    scrapeDesignSystemExamples(),
  ];
  const settled = await Promise.allSettled(tasks);

  const legacy: LegacyDirectoryEntry[] = [
    ...existing.items.map((item) => item as unknown as LegacyDirectoryEntry),
    ...settled
      .filter((r): r is PromiseFulfilledResult<DirectoryEntry[]> => r.status === "fulfilled")
      .flatMap((r) => r.value.map((item) => item as unknown as LegacyDirectoryEntry)),
  ];

  const normalized = normalizeCatalog(legacy);
  const items = await enrichCatalogInstalls(normalized);

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}
