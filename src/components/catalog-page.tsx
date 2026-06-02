"use client";

import { useMemo, useState } from "react";
import { Copy, Database, PlugZap, Wrench, X } from "lucide-react";

import { AgentQuery } from "@/components/agent-query";
import { AgentResults } from "@/components/agent-results";
import { CopyFeedbackButton, CopyIconButton } from "@/components/copy-feedback-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { entryLink, entrySummary, formatCatalogCount, formatInstallCommand } from "@/lib/display";
import type { AgentResponse, Catalog, DirectoryEntry, EntryKind } from "@/lib/types";

const kinds: EntryKind[] = ["skill", "mcp", "plugin"];

const MIN_SEARCH_LENGTH = 2;

const kindMeta: Record<EntryKind, { label: string; icon: typeof Wrench }> = {
  skill: { label: "Skills", icon: Wrench },
  mcp: { label: "MCP", icon: Database },
  plugin: { label: "Plugins", icon: PlugZap },
};

function matchesSearch(entry: DirectoryEntry, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const haystack = [entry.name, entry.summary, entry.description, entry.metadata.author, ...entry.tags, entry.kind]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return trimmed.split(/\s+/).every((token) => haystack.includes(token));
}

function EntryCard({ item, highlight }: { item: DirectoryEntry; highlight?: boolean }) {
  const commandText = item.install.command ?? formatInstallCommand(item);
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
          <code className="font-mono text-body-sm break-all">{commandText}</code>
          <CopyIconButton
            value={commandText}
            copyKey={`${item.id}-command`}
            ariaLabel={`Copy setup command for ${item.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </CopyIconButton>
        </div>
      </div>

      <div className="mt-3">
        <CopyFeedbackButton
          value={item.install.agentPrompt}
          copyKey={`${item.id}-prompt`}
          className="w-full"
          variant="outline"
          size="sm"
        >
          Copy prompt for coding agent
        </CopyFeedbackButton>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);

  const activeSearch = searchQuery.trim().length >= MIN_SEARCH_LENGTH ? searchQuery.trim() : "";

  const items = useMemo(() => {
    let filtered = initialCatalog.items;
    if (activeKind !== "all") {
      filtered = filtered.filter((item) => item.kind === activeKind);
    }
    if (activeSearch) {
      filtered = filtered.filter((item) => matchesSearch(item, activeSearch));
    }
    return filtered;
  }, [activeKind, activeSearch, initialCatalog.items]);

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

          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-52">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tools..."
                aria-label="Search catalog"
                className="h-8 w-full rounded-md border border-input bg-background py-1 pr-8 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <p className="text-body-sm text-muted-foreground">
          Showing {items.length} {activeKind === "all" ? "tools" : kindMeta[activeKind].label.toLowerCase()}
          {activeSearch ? ` matching “${activeSearch}”` : ""}
          {agentResponse ? " (matches highlighted when listed below)" : ""}
        </p>

        {activeSearch && items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">
            No tools match your search. Try different keywords or clear the filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <EntryCard key={item.id} item={item} highlight={highlightedIds.has(item.id)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
