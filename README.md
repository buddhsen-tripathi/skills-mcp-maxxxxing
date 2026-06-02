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

## Agent (OpenRouter)

The **Directory agent** panel (top right) is not just search. It:

1. **Retrieves** relevant tools from `catalog.json` using your question
2. **Reasons** over candidates with an LLM via [OpenRouter](https://openrouter.ai) (when configured)
3. **Returns** a ranked setup plan, per-tool rationale, README install commands, a **handoff prompt**, and a **megaskill** — a composite `SKILL.md` tailored to your query

### Configure

Create `.env.local` (see `.env.example`):

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4   # any model slug from openrouter.ai/models
```

Optional:

```bash
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Skills MCP Directory
```

Without `OPENROUTER_API_KEY`, the agent falls back to keyword matching and tells you in the response.

### API

`POST /api/agent/query` with `{ "query": "..." }` returns:

- `mode`: `"llm"` or `"keyword"`
- `summary`, `plan`, `recommended`, `handoff`, `actions`, `megaskill`

**Megaskill** (`megaskill` in the response):

- `skillMarkdown` — full Cursor-style `SKILL.md` (frontmatter + workflow)
- `installPath` — e.g. `.cursor/skills/{name}/SKILL.md`
- `installScript` — shell one-liner to create the file locally

Regenerate only the megaskill from an existing plan:

`POST /api/agent/megaskill` with `{ "query": "...", "plan": [...] }`

Implementation: `src/lib/agent/llm-agent.ts`, `src/lib/agent/megaskill.ts`, `src/lib/openrouter.ts`

## Run locally

```bash
bun install
bun run dev
```

Refresh catalog data (CLI only, not exposed in the UI):

```bash
bun run scrape
```

Reputed sources ingested on each scrape:

| Source | What you get |
|--------|----------------|
| [skills.sh](https://www.skills.sh) | Agent skills from sitemap (`npx skills add owner/repo`) |
| [getdesign.md](https://getdesign.md) | DESIGN.md references from VoltAgent/awesome-design-md |
| [MCP Registry](https://registry.modelcontextprotocol.io) | Official MCP servers |
| Awesome READMEs | agent-skill.co, awesome-claude-skills, Composio skills |
| GitHub search + awesome lists | MCP servers, agents, llms.txt repos |

Optional env limits: `SCRAPE_SKILLS_SH_LIMIT` (default 1200), `SCRAPE_MCP_REGISTRY_LIMIT` (default 350).

## API

| Route | Purpose |
|---|---|
| `GET /api/catalog/items` | Full catalog JSON |
| `GET /api/catalog/meta` | Path, counts, last scrape time |
| `POST /api/catalog/scrape` | Re-run scrapers (dev/ops) |
| `POST /api/agent/query` | Agent search + plan + handoff + megaskill |
| `POST /api/agent/megaskill` | Regenerate megaskill from query + plan |
