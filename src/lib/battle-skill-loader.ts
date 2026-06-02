import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { entrySummary } from "@/lib/display";
import type { DirectoryEntry } from "@/lib/types";

const execFileAsync = promisify(execFile);

export type SkillLoadSource = "local" | "remote" | "catalog";

export type SkillLoadResult = {
  content: string;
  source: SkillLoadSource;
  path: string | null;
  bytes: number;
  preview: string;
  installed: boolean;
  installError?: string;
};

const SKILL_ROOT = path.join(process.cwd(), ".tools/skills");
const MAX_SKILL_BYTES = 120_000;
const MAX_SEARCH_DEPTH = 10;
const SKILL_FILENAMES = new Set(["SKILL.md", "skill.md"]);
const REPO_AGENT_DOCS = ["AGENTS.md", "CLAUDE.md"] as const;

function skillDir(slug: string): string {
  return path.join(SKILL_ROOT, slug);
}

function preview(content: string, limit = 500): string {
  return content.length <= limit ? content : `${content.slice(0, limit)}…`;
}

function fallbackSkillContent(entry: DirectoryEntry): string {
  return `# ${entry.name}

${entry.description}

## Summary
${entrySummary(entry)}

## Tags
${entry.tags.join(", ") || "none"}

## Setup
${entry.install.command ?? entry.install.agentPrompt}

## Agent handoff
${entry.install.agentPrompt}`;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findShallowestSkillFile(dir: string): Promise<string | null> {
  const state: { best: { path: string; depth: number } | null } = { best: null };

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > MAX_SEARCH_DEPTH) return;

    for (const filename of SKILL_FILENAMES) {
      const candidate = path.join(current, filename);
      if (await pathExists(candidate)) {
        if (!state.best || depth < state.best.depth) {
          state.best = { path: candidate, depth };
        }
      }
    }

    let entries: { name: string; isDirectory(): boolean }[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    const subdirs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules")
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const subdir of subdirs) {
      await walk(path.join(current, subdir.name), depth + 1);
    }
  }

  await walk(dir, 0);
  return state.best?.path ?? null;
}

async function loadRepoAgentDoc(root: string): Promise<{ content: string; path: string } | null> {
  for (const filename of REPO_AGENT_DOCS) {
    const candidate = path.join(root, filename);
    const content = await readSkillFile(candidate);
    if (content) {
      return { content, path: candidate };
    }
  }
  return null;
}

async function readSkillFile(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_SKILL_BYTES) return null;
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function loadLocalSkill(slug: string): Promise<{ content: string; path: string } | null> {
  const roots = [skillDir(slug), path.join(process.cwd(), "skills", slug)];

  for (const root of roots) {
    if (!(await pathExists(root))) continue;

    for (const filename of SKILL_FILENAMES) {
      const candidate = path.join(root, filename);
      const content = await readSkillFile(candidate);
      if (content) {
        return { content, path: candidate };
      }
    }

    const agentDoc = await loadRepoAgentDoc(root);
    if (agentDoc) {
      return agentDoc;
    }

    const skillPath = await findShallowestSkillFile(root);
    if (!skillPath) continue;

    const content = await readSkillFile(skillPath);
    if (content) {
      return { content, path: skillPath };
    }
  }

  return null;
}

function parseGitCloneCommand(command: string): { repoUrl: string; target: string } | null {
  const parts = command.split(/\s+/);
  const cloneIndex = parts.indexOf("clone");
  if (cloneIndex === -1) return null;

  const repoUrl = parts[cloneIndex + 1];
  if (!repoUrl) return null;

  return { repoUrl, target: parts[cloneIndex + 2] ?? "" };
}

async function refreshGitRepo(repoDir: string): Promise<void> {
  try {
    await execFileAsync("git", ["-C", repoDir, "pull", "--ff-only"], { timeout: 120_000 });
  } catch {
    // Existing clone is still usable if pull fails offline or diverged.
  }
}

async function fetchRemoteSkillPaths(repo: string): Promise<string[]> {
  const paths: string[] = [];

  for (const branch of ["main", "master"]) {
    for (const filename of ["SKILL.md", "skill.md"]) {
      paths.push(`${filename}`);
      paths.push(`skills/${filename}`);
      paths.push(`.cursor/skills/${filename}`);
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, {
        next: { revalidate: 3600 },
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) continue;

      const data = (await response.json()) as { tree?: { path: string }[] };
      for (const item of data.tree ?? []) {
        const base = path.basename(item.path);
        if (SKILL_FILENAMES.has(base)) {
          paths.push(item.path);
        }
      }
    } catch {
      // ignore tree lookup failures
    }
  }

  return [...new Set(paths)];
}

async function fetchRemoteSkill(repo: string): Promise<{ content: string; path: string } | null> {
  const candidates = await fetchRemoteSkillPaths(repo);

  for (const branch of ["main", "master"]) {
    for (const candidate of candidates) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${candidate}`;
      try {
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) continue;

        const content = await response.text();
        if (content.length > MAX_SKILL_BYTES) continue;

        return { content, path: `${repo}@${branch}:${candidate}` };
      } catch {
        // try next candidate
      }
    }
  }

  return null;
}

export async function isSkillInstalled(slug: string): Promise<boolean> {
  if (await loadLocalSkill(slug)) return true;
  return pathExists(path.join(skillDir(slug), ".git"));
}

export async function ensureSkillInstalled(entry: DirectoryEntry): Promise<{ installed: boolean; error?: string }> {
  if (entry.kind !== "skill") {
    return { installed: false, error: "Not a skill entry" };
  }

  if (await loadLocalSkill(entry.slug)) {
    return { installed: true };
  }

  const command = entry.install.command?.trim();
  if (!command?.startsWith("git clone")) {
    return { installed: false, error: "No git install command available" };
  }

  const parsed = parseGitCloneCommand(command);
  if (!parsed) {
    return { installed: false, error: "No git install command available" };
  }

  await fs.mkdir(SKILL_ROOT, { recursive: true });

  const absoluteTarget = path.isAbsolute(parsed.target)
    ? parsed.target
    : path.join(process.cwd(), parsed.target || skillDir(entry.slug));

  try {
    if (await pathExists(path.join(absoluteTarget, ".git"))) {
      await refreshGitRepo(absoluteTarget);
      return { installed: true };
    }

    if (await pathExists(absoluteTarget)) {
      const loaded = await loadLocalSkill(entry.slug);
      return loaded
        ? { installed: true }
        : { installed: false, error: "Skill directory exists but no SKILL.md or agent docs found" };
    }

    await execFileAsync("git", ["clone", "--depth", "1", parsed.repoUrl, absoluteTarget], {
      timeout: 120_000,
    });

    return { installed: (await loadLocalSkill(entry.slug)) !== null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Install failed";

    if (message.includes("already exists") && (await pathExists(path.join(absoluteTarget, ".git")))) {
      await refreshGitRepo(absoluteTarget);
      return { installed: true };
    }

    if (await loadLocalSkill(entry.slug)) {
      return { installed: true };
    }

    return { installed: false, error: message };
  }
}

export async function loadSkillContent(
  entry: DirectoryEntry,
  options: { install?: boolean } = { install: true },
): Promise<SkillLoadResult> {
  let installed = await isSkillInstalled(entry.slug);
  let installError: string | undefined;

  if (options.install && !installed) {
    const installResult = await ensureSkillInstalled(entry);
    installed = installResult.installed;
    installError = installResult.error;
  }

  const local = await loadLocalSkill(entry.slug);
  if (local) {
    return {
      content: local.content,
      source: "local",
      path: local.path,
      bytes: local.content.length,
      preview: preview(local.content),
      installed: true,
    };
  }

  if (entry.source.repo) {
    const remote = await fetchRemoteSkill(entry.source.repo);
    if (remote) {
      return {
        content: remote.content,
        source: "remote",
        path: remote.path,
        bytes: remote.content.length,
        preview: preview(remote.content),
        installed,
        installError,
      };
    }
  }

  const content = fallbackSkillContent(entry);
  return {
    content,
    source: "catalog",
    path: null,
    bytes: content.length,
    preview: preview(content),
    installed,
    installError,
  };
}

export function buildSkillSystemPrompt(entry: Pick<DirectoryEntry, "name">, skillContent: string): string {
  return `You are a design-variant generator. An agent skill is loaded and must shape the visual output.

## Loaded skill: ${entry.name}

The skill below governs taste, layout decisions, typography, spacing, and anti-patterns. Apply it fully.

---
${skillContent}
---

## Output contract (strict)

Generate exactly ONE React design variant per request.

Return your response as Markdown with:
1. A short "## Variant" section (2-4 bullets on design choices driven by the skill)
2. A single \`\`\`jsx code fence containing:
   - \`function Variant() { ... return (...); }\`
   - inline styles only (\`style={{ ... }}\`) — no Tailwind, no CSS imports
   - no import statements
   - no TypeScript types
   - a complete, polished UI fragment that answers the user's design brief

The jsx block renders live in a React preview. Prioritize visual quality and skill fidelity over brevity.`;
}
