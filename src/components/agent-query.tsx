"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentResponse } from "@/lib/types";

export function AgentQuery({ onResponse }: { onResponse: (payload: AgentResponse) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const payload = (await response.json()) as AgentResponse;
      onResponse(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-eyebrow uppercase text-muted-foreground">
        <Search className="h-4 w-4" />
        Find tools
      </div>
      <h2 className="text-card-title">What are you building?</h2>
      <p className="mt-2 text-body text-muted-foreground">
        Describe your stack or workflow. We will suggest skills, MCP servers, and plugins with setup commands you can run or paste into your coding agent.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleSubmit();
            }
          }}
          placeholder="Browser automation for E2E tests in Next.js"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Finding matches..." : "Search directory"}
        </Button>
      </div>
    </div>
  );
}
