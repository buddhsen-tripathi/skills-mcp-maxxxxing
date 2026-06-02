"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseSkillNameFromMarkdown, type CustomBattleSkill } from "@/lib/battle-custom-skill";

type PasteMegaskillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (skill: CustomBattleSkill) => void;
  initialContent?: string;
  initialName?: string;
};

export function PasteMegaskillDialog({
  open,
  onOpenChange,
  onApply,
  initialContent = "",
  initialName = "",
}: PasteMegaskillDialogProps) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initialName);
      setContent(initialContent);
    }
    onOpenChange(next);
  }

  function handleApply() {
    const trimmed = content.trim();
    if (trimmed.length < 20) return;
    onApply({
      name: name.trim() || parseSkillNameFromMarkdown(trimmed),
      content: trimmed,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Paste megaskill</DialogTitle>
          <DialogDescription>
            Drop in a SKILL.md from the directory agent or your own workflow. This pane will battle using your pasted instructions instead of a catalog skill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="megaskill-name" className="mb-1 block text-xs text-muted-foreground">
              Display name (optional)
            </label>
            <input
              id="megaskill-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Auto-detected from frontmatter"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <div>
            <label htmlFor="megaskill-content" className="mb-1 block text-xs text-muted-foreground">
              SKILL.md content
            </label>
            <textarea
              id="megaskill-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste your megaskill markdown here…"
              rows={12}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={content.trim().length < 20}>
            Use in battle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
