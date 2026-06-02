import { inferKind, isQualityEntry, normalizeCatalog, normalizeEntry } from "@/lib/catalog-normalize";
import type { Catalog, DirectoryEntry, EntryKind, LegacyDirectoryEntry } from "@/lib/types";

function rawEntry(partial: {
  name: string;
  kind: EntryKind;
  description: string;
  tags: string[];
  author?: string;
  stars?: number;
  url?: string;
  docs?: LegacyDirectoryEntry["docs"];
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
    install: { command: null, agentPrompt: "" },
    source: {
      type: partial.url?.includes("github.com") ? "github" : partial.url ? "website" : "manual",
      url: partial.url,
    },
    updatedAt: new Date().toISOString(),
  };
  return normalizeEntry(legacy);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "skills-mcp-maxxxxing" },
  });
  if (!response.ok) throw new Error(`Failed fetch ${url}: ${response.status}`);
  return response.text();
}

type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  topics?: string[];
  stargazers_count: number;
  owner?: { login?: string };
};

async function fetchGitHubRepos(query: string, perPage: number): Promise<GitHubRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "skills-mcp-maxxxxing",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw new Error(`GitHub search failed: ${response.status}`);
  const data = (await response.json()) as { items?: GitHubRepo[] };
  return data.items ?? [];
}

function parseAwesomeMarkdown(text: string, sourceLabel: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*[-*]\s+\[(.+?)\]\((https?:\/\/[^)]+)\)\s*(?:[-–—:]\s*(.+))?$/.exec(line.trim());
    if (!match) continue;
    const [, name, link, descriptionRaw] = match;
    const description = descriptionRaw?.trim() || "Tool listed in a curated awesome collection.";
    const kind = inferKind(name, description, [sourceLabel]);
    const entry = rawEntry({
      name,
      kind,
      description,
      tags: [sourceLabel, kind],
      url: link,
      docs: {
        readme: link,
        llms: /llms\.txt/i.test(line) ? link : undefined,
        design: /design\.md/i.test(line) ? link : undefined,
      },
    });
    if (isQualityEntry(entry)) entries.push(entry);
  }
  return entries;
}

function reposToEntries(repos: GitHubRepo[]): DirectoryEntry[] {
  return repos
    .map((repo) => {
      const description = repo.description?.trim();
      if (!description || description.length < 12) return null;
      const entry = rawEntry({
        name: repo.name,
        kind: inferKind(repo.name, description, repo.topics ?? []),
        description,
        tags: repo.topics ?? [],
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

  const results = await Promise.allSettled(sources.map((url) => fetchText(url).then((t) => parseAwesomeMarkdown(t, "curated-list"))));
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
    .filter((r): r is PromiseFulfilledResult<GitHubRepo[]> => r.status === "fulfilled")
    .flatMap((r) => reposToEntries(r.value));
}

async function scrapeCuratedMcpRepos(): Promise<DirectoryEntry[]> {
  const repos = ["modelcontextprotocol/servers", "punkpeye/awesome-mcp-servers"];
  const entries: DirectoryEntry[] = [];

  for (const repoPath of repos) {
    const data = await fetch(`https://api.github.com/repos/${repoPath}`, {
      headers: { "User-Agent": "skills-mcp-maxxxxing", Accept: "application/vnd.github+json" },
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
      tags: ["mcp", ...(data.topics ?? [])],
      author: data.owner?.login,
      stars: data.stargazers_count,
      url: data.html_url ?? `https://github.com/${repoPath}`,
    });
    if (isQualityEntry(entry)) entries.push(entry);
  }

  return entries;
}

async function scrapeDesignSystemExamples(): Promise<DirectoryEntry[]> {
  const websites = [
    { name: "shadcn/ui", description: "Copy-paste React components built on Radix and Tailwind.", url: "https://ui.shadcn.com", tags: ["ui", "react", "components"] },
    { name: "Framer Motion", description: "Animation library for React.", url: "https://www.framer.com/motion/", tags: ["motion", "react"] },
    { name: "Tailwind CSS", description: "Utility-first CSS framework.", url: "https://tailwindcss.com", tags: ["css", "design"] },
  ];

  return websites.map((item) =>
    rawEntry({
      name: item.name,
      kind: "plugin",
      description: item.description,
      tags: item.tags,
      url: item.url,
      docs: { readme: item.url, design: item.url },
    }),
  );
}

export async function runScraperAgents(existing: Catalog): Promise<Catalog> {
  const tasks = [scrapeAwesomeCollections(), scrapeCuratedMcpRepos(), scrapeGitHubSearchAgents(), scrapeDesignSystemExamples()];
  const settled = await Promise.allSettled(tasks);

  const legacy: LegacyDirectoryEntry[] = [
    ...existing.items.map((item) => item as unknown as LegacyDirectoryEntry),
    ...settled
      .filter((r): r is PromiseFulfilledResult<DirectoryEntry[]> => r.status === "fulfilled")
      .flatMap((r) => r.value.map((item) => item as unknown as LegacyDirectoryEntry)),
  ];

  const items = normalizeCatalog(legacy);

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}
