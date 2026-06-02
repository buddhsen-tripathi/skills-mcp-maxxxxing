# Skills / MCP / Plugin Directory

Directory for skills, MCP servers, and plugins used in AI-assisted software development.

## Where scraped data lives

All catalog data is stored in a single local JSON file:

**`src/data/catalog.json`**

- Written by `bun run scrape` (see `scripts/scrape.ts`)
- Normalized on every read/write via `src/lib/catalog-normalize.ts`
- Validated with Zod (`src/lib/catalog-schema.ts`)
- This is **not** a database. It is a file on disk, loaded into memory when the server handles requests.

Seed fallback: `src/data/seed.ts` (used only if `catalog.json` is missing or invalid).

### Entry shape (structured)

Each item in `catalog.json`:

```json
{
  "id": "mcp-playwright",
  "slug": "playwright",
  "name": "Playwright MCP",
  "kind": "mcp",
  "summary": "Short one-line description for cards (max ~200 chars)",
  "description": "Cleaned source blurb (max ~400 chars)",
  "tags": ["mcp", "browser", "testing"],
  "metadata": { "author": "org", "stars": 1200 },
  "links": {
    "repository": "https://github.com/...",
    "docs": "https://...",
    "llmsTxt": "optional",
    "designMd": "optional"
  },
  "install": {
    "method": "npm | git | manual",
    "command": "verified command or null",
    "agentPrompt": "paste into your coding agent"
  },
  "source": { "type": "github", "url": "...", "repo": "owner/name" },
  "updatedAt": "ISO-8601"
}
```

Re-normalize existing file without re-scraping:

```bash
bun run normalize
```

## Agent layer

Search uses `POST /api/agent/query`, implemented in:

- `src/lib/agent/intent.ts` — detects stack and tool type from your question
- `src/lib/agent/retrieval.ts` — ranks entries from the catalog
- `src/lib/agent/planner.ts` — builds a step-by-step plan and a full handoff prompt

The UI shows a recommended stack, per-step rationale, setup commands, and **Copy full handoff for coding agent** (paste into Cursor, Claude Code, etc.).

## Run locally

```bash
bun install
bun run dev
```

Refresh catalog data (CLI only, not exposed in the UI):

```bash
bun run scrape
```

## API

| Route | Purpose |
|---|---|
| `GET /api/catalog/items` | Full catalog JSON |
| `GET /api/catalog/meta` | Path, counts, last scrape time |
| `POST /api/catalog/scrape` | Re-run scrapers (dev/ops) |
| `POST /api/agent/query` | Agent search + plan + handoff |
