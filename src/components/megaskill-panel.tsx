"use client";

import Link from "next/link";
import { useState } from "react";
import { Swords } from "lucide-react";

import { CopyFeedbackButton } from "@/components/copy-feedback-button";
import { Collapsible } from "@/components/collapsible";
import { Button } from "@/components/ui/button";
import { storePendingMegaskill } from "@/lib/battle-custom-skill";
import type { Megaskill } from "@/lib/types";

export function MegaskillPanel({ megaskill }: { megaskill: Megaskill }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-headline">Your megaskill</h2>
          <p className="mt-2 text-body text-muted-foreground">{megaskill.summary}</p>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Save to <code className="font-mono">{megaskill.installPath}</code> in your project (or{" "}
            <code className="font-mono">~/.cursor/skills/{megaskill.name}/SKILL.md</code> for all projects).
          </p>
        </div>
        <button
          type="button"
          className="text-body-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide preview" : "Show preview"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {megaskill.whenToUse.slice(0, 4).map((item) => (
          <span key={item} className="rounded-md border border-border px-2 py-1 text-caption text-muted-foreground">
            {item.length > 48 ? `${item.slice(0, 48)}…` : item}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <CopyFeedbackButton value={megaskill.skillMarkdown} copyKey="megaskill-md" variant="default" size="default">
          Copy SKILL.md
        </CopyFeedbackButton>
        <CopyFeedbackButton value={megaskill.installScript} copyKey="megaskill-install" variant="outline" size="default">
          Copy install script
        </CopyFeedbackButton>
        <Button variant="outline" size="default" className="gap-1.5" asChild>
          <Link
            href="/battle"
            onClick={() => {
              storePendingMegaskill({ name: megaskill.name, content: megaskill.skillMarkdown }, "left");
            }}
          >
            <Swords className="h-3.5 w-3.5" />
            Battle this megaskill
          </Link>
        </Button>
      </div>

      <Collapsible expanded={expanded}>
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-md border border-border bg-muted/50 p-4 font-mono text-caption leading-relaxed text-foreground">
          {megaskill.skillMarkdown}
        </pre>
      </Collapsible>
    </div>
  );
}
