import { clearInstallReadmeCache, isGuessedMcpCommand, resolveInstallFromRepo } from "@/lib/install-extract";
import type { DirectoryEntry } from "@/lib/types";

const CONCURRENCY = 6;

function needsReadmeEnrich(entry: DirectoryEntry): boolean {
  const repo = entry.source.repo;
  if (!repo) return false;
  if (entry.tags.includes("skills-sh") && entry.install.command?.startsWith("npx skills ")) return false;
  if (entry.tags.includes("getdesign-md")) return false;
  if (entry.tags.includes("mcp-registry")) return false;
  if (!entry.install.command) return true;
  if (isGuessedMcpCommand(entry.install.command, entry.slug)) return true;
  if (/#\s*or:/i.test(entry.install.command)) return true;
  if (entry.kind === "mcp" && /^npm\s+install\b/i.test(entry.install.command) && !/npx|mcp/i.test(entry.install.command)) {
    return true;
  }
  if (entry.install.command.startsWith("git clone") && entry.install.command.includes(".tools/skills/")) return true;
  if (entry.install.command.startsWith("git clone") && entry.kind !== "skill") return true;
  if (entry.install.command.startsWith("bun add ") && entry.slug !== entry.install.command.replace("bun add ", "")) {
    return true;
  }
  return false;
}

function buildAgentPrompt(name: string, command: string, docsUrl?: string): string {
  return `Install and configure ${name} in this project. Run: ${command}${docsUrl ? ` Docs: ${docsUrl}` : ""}. Verify it works and document usage for the team.`;
}

async function enrichOne(entry: DirectoryEntry): Promise<DirectoryEntry> {
  const repo = entry.source.repo;
  if (!repo || !needsReadmeEnrich(entry)) return entry;

  const extracted = await resolveInstallFromRepo(repo);
  if (!extracted) return entry;

  const docsUrl = entry.links.docs ?? entry.links.repository ?? entry.source.url;

  return {
    ...entry,
    install: {
      method: extracted.method,
      command: extracted.command.slice(0, 280),
      agentPrompt: buildAgentPrompt(entry.name, extracted.command, docsUrl),
    },
  };
}

async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

export async function enrichCatalogInstalls(items: DirectoryEntry[], options?: { force?: boolean }): Promise<DirectoryEntry[]> {
  if (options?.force) clearInstallReadmeCache();
  const targets = items.filter(needsReadmeEnrich);
  const byRepo = new Map<string, DirectoryEntry[]>();

  for (const entry of targets) {
    const repo = entry.source.repo!;
    const list = byRepo.get(repo) ?? [];
    list.push(entry);
    byRepo.set(repo, list);
  }

  const uniqueRepos = Array.from(byRepo.keys());
  await mapPool(uniqueRepos, (repo) => resolveInstallFromRepo(repo), CONCURRENCY);

  return mapPool(items, enrichOne, CONCURRENCY);
}
