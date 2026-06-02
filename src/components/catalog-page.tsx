"use client";

import { useMemo, useState } from "react";
import { Copy, Database, PlugZap, Wrench } from "lucide-react";

import { AgentQuery } from "@/components/agent-query";
import { AgentResults } from "@/components/agent-results";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { entryLink, entrySummary, formatCatalogCount, formatInstallCommand } from "@/lib/display";
import type { AgentResponse, Catalog, DirectoryEntry, EntryKind } from "@/lib/types";

const kinds: EntryKind[] = ["skill", "mcp", "plugin"];

const kindMeta: Record<EntryKind, { label: string; icon: typeof Wrench }> = {
  skill: { label: "Skills", icon: Wrench },
  mcp: { label: "MCP", icon: Database },
  plugin: { label: "Plugins", icon: PlugZap },
};

function copyToClipboard(value: string) {
  void navigator.clipboard.writeText(value);
}

function EntryCard({ item, highlight }: { item: DirectoryEntry; highlight?: boolean }) {
  const Icon = kindMeta[item.kind].icon;
  const summary = entrySummary(item);

  return (
    <article
      className={`rounded-lg border bg-card p-6 shadow-sm transition-colors hover:border-ring hover:bg-accent/50 ${
        highlight ? "border-ring" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-sm border border-border px-2 py-1 text-caption text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {kindMeta[item.kind].label}
        </span>
        <span className="text-caption text-muted-foreground">
          {item.metadata.stars ? `${item.metadata.stars.toLocaleString()} stars` : (item.metadata.author ?? "Curated")}
        </span>
      </div>
      <h3 className="text-card-title">{item.name}</h3>
      <p className="mt-2 line-clamp-3 text-body-sm text-muted-foreground">{summary}</p>

      <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
        <p className="text-caption text-muted-foreground">Setup command</p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <code className="font-mono text-body-sm break-all">{formatInstallCommand(item)}</code>
          <button
            type="button"
            className="shrink-0 rounded-sm border border-border p-1 text-muted-foreground hover:text-foreground"
            onClick={() => copyToClipboard(item.install.command ?? formatInstallCommand(item))}
            aria-label={`Copy setup command for ${item.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => copyToClipboard(item.install.agentPrompt)}
        >
          Copy prompt for coding agent
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags
          .filter((tag) => !["awesome-list", "agentic", "github"].includes(tag))
          .slice(0, 4)
          .map((tag) => (
            <span key={tag} className="rounded-md border border-border px-2 py-1 text-caption text-muted-foreground">
              {tag}
            </span>
          ))}
      </div>
      {entryLink(item) ? (
        <a
          href={entryLink(item)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-body-sm text-foreground underline-offset-4 hover:underline"
        >
          View repository
        </a>
      ) : null}
    </article>
  );
}

export function CatalogPage({ initialCatalog }: { initialCatalog: Catalog }) {
  const [activeKind, setActiveKind] = useState<EntryKind | "all">("all");
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);

  const items = useMemo(() => {
    if (activeKind === "all") return initialCatalog.items;
    return initialCatalog.items.filter((item) => item.kind === activeKind);
  }, [activeKind, initialCatalog.items]);

  const highlightedIds = useMemo(
    () => new Set(agentResponse?.recommended.map((item) => item.id) ?? []),
    [agentResponse],
  );

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-24 md:px-8">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="text-eyebrow uppercase text-muted-foreground">Tool directory</p>
          <h1 className="mt-3 text-display-md md:text-display-lg">Skills, MCP servers, plugins</h1>
          <p className="mt-4 max-w-3xl text-body-lg text-muted-foreground">
            Browse vetted tools for AI-assisted development, or search by what you are building to get a setup plan and a handoff prompt for your coding agent.
          </p>
          <p className="mt-3 text-body-sm text-muted-foreground">{formatCatalogCount(initialCatalog.items.length)}</p>
        </div>

        <div className="lg:justify-self-end lg:w-full lg:max-w-xl">
          <AgentQuery onResponse={setAgentResponse} />
        </div>
      </section>

      {agentResponse ? <AgentResults response={agentResponse} /> : null}

      <section className="mt-12 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center">
            <Button
              variant={activeKind === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setActiveKind("all")}
            >
              All
            </Button>
            {kinds.map((kind, idx) => (
              <Button
                key={kind}
                variant={activeKind === kind ? "default" : "outline"}
                size="sm"
                className={idx === kinds.length - 1 ? "rounded-l-none" : "rounded-none"}
                onClick={() => setActiveKind(kind)}
              >
                {kindMeta[kind].label}
              </Button>
            ))}
          </div>
          <ThemeToggle />
        </div>

        <p className="text-body-sm text-muted-foreground">
          Showing {items.length} {activeKind === "all" ? "tools" : kindMeta[activeKind].label.toLowerCase()}
          {agentResponse ? " (matches highlighted when listed below)" : ""}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <EntryCard key={item.id} item={item} highlight={highlightedIds.has(item.id)} />
          ))}
        </div>
      </section>
    </main>
  );
}
