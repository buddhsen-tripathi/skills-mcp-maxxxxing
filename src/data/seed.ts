import type { Catalog } from "@/lib/types";

export const seedCatalog: Catalog = {
  generatedAt: new Date().toISOString(),
  items: [
    {
      id: "skill-cursor-sdk",
      slug: "cursor-sdk-skill",
      name: "Cursor SDK Skill",
      kind: "skill",
      summary: "Guides implementation of Cursor SDK automations and integrations.",
      description: "Guides implementation of Cursor SDK automations and integrations.",
      tags: ["cursor", "sdk", "automation", "skill"],
      metadata: { author: "Cursor" },
      links: {
        homepage: "https://docs.cursor.com",
        docs: "https://docs.cursor.com",
        llmsTxt: "https://docs.cursor.com/sdk",
      },
      install: {
        method: "manual",
        command: null,
        agentPrompt: "Read Cursor SDK docs and scaffold a minimal agent workflow for this project.",
      },
      source: { type: "manual" },
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mcp-playwright",
      slug: "playwright",
      name: "Playwright MCP",
      kind: "mcp",
      summary: "Browser automation MCP for snapshots, clicks, and form interactions.",
      description: "Browser automation MCP for snapshots, clicks, and form interactions.",
      tags: ["mcp", "browser", "automation", "testing"],
      metadata: { author: "modelcontextprotocol" },
      links: {
        docs: "https://github.com/modelcontextprotocol/servers",
        repository: "https://github.com/modelcontextprotocol/servers",
      },
      install: {
        method: "npm",
        command: "npx -y @modelcontextprotocol/server-playwright",
        agentPrompt: "Install the Playwright MCP server, add it to agent config, and run a smoke test.",
      },
      source: {
        type: "github",
        url: "https://github.com/modelcontextprotocol/servers",
        repo: "modelcontextprotocol/servers",
      },
      updatedAt: new Date().toISOString(),
    },
    {
      id: "plugin-shadcn-ui",
      slug: "shadcn-ui",
      name: "shadcn/ui",
      kind: "plugin",
      summary: "Copy-paste React components with full code ownership.",
      description: "Copy-paste React components with full code ownership.",
      tags: ["ui", "react", "components", "plugin"],
      metadata: { author: "shadcn" },
      links: {
        homepage: "https://ui.shadcn.com",
        docs: "https://ui.shadcn.com",
      },
      install: {
        method: "npm",
        command: "bunx shadcn@latest init",
        agentPrompt: "Initialize shadcn/ui and add the primitives this app needs.",
      },
      source: { type: "website", url: "https://ui.shadcn.com" },
      updatedAt: new Date().toISOString(),
    },
  ],
};
