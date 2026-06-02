import type { AgentIntent, EntryKind } from "@/lib/types";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "for",
  "to",
  "and",
  "or",
  "with",
  "in",
  "of",
  "i",
  "need",
  "find",
  "want",
  "build",
  "using",
  "use",
  "my",
  "app",
  "project",
]);

const STACK_HINTS: Record<string, string[]> = {
  nextjs: ["next", "nextjs", "next.js", "app router"],
  react: ["react", "jsx", "tsx"],
  typescript: ["typescript", "ts", "tsx"],
  python: ["python", "py", "fastapi", "django"],
  browser: ["browser", "playwright", "puppeteer", "e2e", "selenium"],
  auth: ["auth", "login", "oauth", "session", "clerk", "better-auth"],
  ui: ["ui", "design", "component", "shadcn", "tailwind"],
  database: ["database", "postgres", "sql", "drizzle", "prisma"],
  api: ["api", "rest", "graphql", "endpoint"],
};

const KIND_HINTS: Record<EntryKind, string[]> = {
  mcp: ["mcp", "model context protocol", "server", "tool calling"],
  skill: ["skill", "rules", "prompt", "workflow", "cursor"],
  plugin: ["plugin", "extension", "package", "library", "sdk", "cli"],
};

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function parseIntent(query: string): AgentIntent {
  const hay = query.toLowerCase();
  const tokens = tokenizeQuery(query);

  const kinds = (Object.keys(KIND_HINTS) as EntryKind[]).filter((kind) =>
    KIND_HINTS[kind].some((hint) => hay.includes(hint)),
  );

  const stack = Object.entries(STACK_HINTS)
    .filter(([, hints]) => hints.some((hint) => hay.includes(hint)))
    .map(([key]) => key);

  const topics = tokens.filter((token) => token.length > 2).slice(0, 12);

  return {
    kinds: kinds.length > 0 ? kinds : ["skill", "mcp", "plugin"],
    topics,
    stack,
  };
}
