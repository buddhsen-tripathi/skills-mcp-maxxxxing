"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentResponse } from "@/lib/types";

export function AgentQuery({ onResponse }: { onResponse: (payload: AgentResponse) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Agent request failed");
      }

      const payload = (await response.json()) as AgentResponse;
      onResponse(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-eyebrow uppercase text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        Directory agent
      </div>
      <h2 className="text-card-title">What are you building?</h2>
      <p className="mt-2 text-body text-muted-foreground">
        Describe your product or workflow. The agent picks tools from the catalog, builds a setup plan, and generates a custom megaskill (SKILL.md) you can drop into Cursor.
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
          placeholder="E2E browser tests for a Next.js app with auth"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Agent is thinking..." : "Ask agent"}
        </Button>
        {error ? <p className="text-body-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
