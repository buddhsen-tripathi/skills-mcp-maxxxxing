"use client";

import { CopyFeedbackButton } from "@/components/copy-feedback-button";
import { MegaskillPanel } from "@/components/megaskill-panel";
import type { AgentResponse } from "@/lib/types";

export function AgentResults({ response }: { response: AgentResponse }) {
  const allCommands = response.actions
    .map((a) => a.command)
    .filter((cmd): cmd is string => Boolean(cmd))
    .join("\n");

  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-headline">Agent recommendation</h2>
          {response.mode === "keyword" ? (
            <span className="rounded-sm border border-border px-2 py-0.5 text-caption text-muted-foreground">
              Keyword search
            </span>
          ) : null}
        </div>
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
                {step.command ?? "No install command in README. Use the agent prompt or repo docs."}
              </code>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <CopyFeedbackButton value={response.handoff} copyKey="handoff" variant="default" size="default">
            Copy full handoff for coding agent
          </CopyFeedbackButton>
          {allCommands ? (
            <CopyFeedbackButton value={allCommands} copyKey="all-commands" variant="outline" size="default">
              Copy all setup commands
            </CopyFeedbackButton>
          ) : null}
        </div>
      </div>

      <MegaskillPanel megaskill={response.megaskill} />
    </section>
  );
}
