import type { InstallMethod } from "@/lib/types";

const INSTALL_SECTION = /^(#{1,3}\s+)(install(ation)?|setup|getting\s+started|quick\s+start|usage)\b/im;

const INSTALL_LINE =
  /^(?:\$?\s*)?(npm\s+(?:i|install|ci)|npx\s+|pnpm\s+(?:i|install|add|dlx)|yarn\s+(?:add|install)|bun\s+(?:add|install)|bunx\s+|pip3?\s+install|poetry\s+add|cargo\s+install|brew\s+install|go\s+install|git\s+clone|curl\s+|docker\s+(?:run|compose)|uv\s+pip\s+install)/i;

const SKIP_LINE = /^(#|<!--|export\s|cd\s+\.|sudo\s)/i;

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /```(?:bash|sh|shell|console|zsh|powershell|txt)?\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function sliceInstallSections(readme: string): string {
  const lines = readme.split("\n");
  const chunks: string[] = [];
  let capture = false;
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) chunks.push(buffer.join("\n"));
    buffer = [];
  };

  for (const line of lines) {
    if (INSTALL_SECTION.test(line)) {
      flush();
      capture = true;
      buffer.push(line);
      continue;
    }
    if (capture && /^#{1,3}\s+/.test(line) && !INSTALL_SECTION.test(line)) {
      flush();
      capture = false;
      continue;
    }
    if (capture) buffer.push(line);
  }
  flush();

  return chunks.length > 0 ? chunks.join("\n\n") : readme.slice(0, 12000);
}

function cleanCommandLine(line: string): string {
  return line
    .replace(/^\$\s*/, "")
    .split("#")[0]
    .trim();
}

function scoreInstallLine(line: string): number {
  let score = 0;
  if (/npx\s+/i.test(line)) score += 12;
  if (/\bmcp\b|@modelcontextprotocol|skills\s+add|bunx\s+/i.test(line)) score += 10;
  if (/playwright|cursor|claude|codex/i.test(line)) score += 4;
  if (/^git\s+clone/i.test(line)) score += 6;
  if (/^npm\s+install\s+-g/i.test(line)) score += 7;
  if (/^(npm|pnpm|yarn|bun)\s+(install|i)\b/i.test(line) && !/or:/i.test(line)) score += 3;
  if (/^(npm|pnpm|yarn|bun)\s+(install|i)\b/i.test(line) && /or:/i.test(line)) score += 1;
  if (/docker\s+run/i.test(line)) score += 5;
  return score;
}

function pickBestCommands(block: string): string[] {
  const lines = block
    .split("\n")
    .map(cleanCommandLine)
    .filter((line) => line.length > 3 && !SKIP_LINE.test(line) && INSTALL_LINE.test(line));

  if (lines.length === 0) return [];

  const ranked = [...lines].sort((a, b) => scoreInstallLine(b) - scoreInstallLine(a));
  const top = ranked[0];
  const second = ranked[1];

  if (second && scoreInstallLine(second) >= 8 && scoreInstallLine(top) >= 8) {
    return [top, second];
  }

  return [top];
}

export function extractInstallFromReadme(readme: string): { command: string; method: InstallMethod } | null {
  const focus = sliceInstallSections(readme);
  const blocks = [...extractCodeBlocks(focus), ...extractCodeBlocks(readme).slice(0, 16)];

  let best: { command: string; method: InstallMethod; score: number } | null = null;

  for (const block of blocks) {
    const picked = pickBestCommands(block);
    if (picked.length === 0) continue;

    const command = picked.join(" && ");
    const score = picked.reduce((sum, line) => sum + scoreInstallLine(line), 0);
    if (!best || score > best.score) {
      best = { command, method: inferMethod(picked[0]), score };
    }
  }

  if (best) return { command: best.command, method: best.method };

  const inline = readme
    .split("\n")
    .map(cleanCommandLine)
    .filter((l) => INSTALL_LINE.test(l) && l.length < 200)
    .sort((a, b) => scoreInstallLine(b) - scoreInstallLine(a));

  if (inline.length > 0) {
    return { command: inline[0], method: inferMethod(inline[0]) };
  }

  return null;
}

function inferMethod(command: string): InstallMethod {
  if (/^git\s+clone/i.test(command)) return "git";
  if (/^(npm|npx|pnpm|yarn|bun|bunx)\s/i.test(command)) return "npm";
  return "manual";
}

export async function fetchGithubReadme(repo: string): Promise<string | null> {
  const branches = ["main", "master"];
  const names = ["README.md", "readme.md", "Readme.md"];

  for (const branch of branches) {
    for (const name of names) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${name}`;
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "skills-mcp-maxxxxing" },
        });
        if (response.ok) return response.text();
      } catch {
        continue;
      }
    }
  }

  return null;
}

const readmeCache = new Map<string, { command: string; method: InstallMethod } | null>();

export function clearInstallReadmeCache(): void {
  readmeCache.clear();
}

export async function resolveInstallFromRepo(repo: string): Promise<{ command: string; method: InstallMethod } | null> {
  if (readmeCache.has(repo)) return readmeCache.get(repo) ?? null;

  const readme = await fetchGithubReadme(repo);
  if (!readme) {
    readmeCache.set(repo, null);
    return null;
  }

  const extracted = extractInstallFromReadme(readme);
  readmeCache.set(repo, extracted);
  return extracted;
}

export function isGuessedMcpCommand(command: string | null, slug: string): boolean {
  if (!command) return false;
  return (
    command.startsWith("npx -y @modelcontextprotocol/server-") &&
    !command.includes(slug) &&
    command === `npx -y @modelcontextprotocol/server-${slug}`
  );
}
