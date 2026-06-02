"use client";

import { Button } from "@/components/ui/button";
import type { AgentResponse } from "@/lib/types";

function copy(value: string) {
  void navigator.clipboard.writeText(value);
}

export function AgentResults({ response }: { response: AgentResponse }) {
  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-headline">Recommended stack</h2>
        <p className="mt-2 text-body text-muted-foreground">{response.summary}</p>
        {response.intent.stack.length > 0 ? (
          <p className="mt-2 text-body-sm text-muted-foreground">Detected stack: {response.intent.stack.join(", ")}</p>
        ) : null}

        <ol className="mt-6 space-y-4">
          {response.plan.map((step, index) => (
            <li key={step.entryId} className="rounded-md border border-border bg-muted/50 p-4">
              <p className="text-body-sm text-muted-foreground">
                Step {index + 1} · {step.kind}
              </p>
              <p className="mt-1 text-card-title">{step.name}</p>
              <p className="mt-2 text-body-sm text-muted-foreground">{step.why}</p>
              <code className="mt-3 block font-mono text-caption break-all text-foreground">
                {step.command ?? "No verified one-line install. Use the agent prompt."}
              </code>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => copy(response.handoff)}>Copy full handoff for coding agent</Button>
          <Button
            variant="outline"
            onClick={() =>
              copy(
                response.actions
                  .map((a) => a.command)
                  .filter((cmd): cmd is string => Boolean(cmd))
                  .join("\n"),
              )
            }
          >
            Copy all setup commands
          </Button>
        </div>
      </div>
    </section>
  );
}
