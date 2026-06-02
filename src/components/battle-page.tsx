"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Swords, Trophy } from "lucide-react";

import { BattlePane, messageText, useBattleChat } from "@/components/battle-pane";
import { PasteMegaskillDialog } from "@/components/paste-megaskill-dialog";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { defaultBattleModels, type BattleModelId } from "@/lib/battle-models";
import type { BattleJudgment } from "@/lib/battle-judgment";
import { consumePendingMegaskill, type CustomBattleSkill } from "@/lib/battle-custom-skill";
import { battlePresets, defaultBattlePreset, resolveToolId, type BattlePreset } from "@/lib/battle-presets";
import type { Catalog, DirectoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

function defaultFighters(items: DirectoryEntry[]): [DirectoryEntry, DirectoryEntry] {
  const leftId = resolveToolId(items, defaultBattlePreset.leftSlug, items[0]?.id ?? "");
  const rightId = resolveToolId(items, defaultBattlePreset.rightSlug, items[1]?.id ?? items[0]?.id ?? "");
  const left = items.find((i) => i.id === leftId) ?? items[0];
  const right = items.find((i) => i.id === rightId) ?? items[1] ?? items[0];
  return [left, right];
}

function PresetBar({
  presets,
  activeId,
  disabled,
  onSelect,
}: {
  presets: BattlePreset[];
  activeId: string;
  disabled?: boolean;
  onSelect: (preset: BattlePreset) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border px-4 py-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(preset)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
            activeId === preset.id
              ? "border-ring bg-accent/40 text-foreground"
              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function JudgeBar({
  judgment,
  judging,
  leftName,
  rightName,
}: {
  judgment: BattleJudgment | null;
  judging: boolean;
  leftName: string;
  rightName: string;
}) {
  if (judging) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
        <Trophy className="size-4 animate-pulse" />
        Judging outputs…
      </div>
    );
  }

  if (!judgment) return null;

  const winnerLabel =
    judgment.winner === "left" ? leftName : judgment.winner === "right" ? rightName : "Tie";

  return (
    <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <Trophy className="size-4 text-amber-500" />
          Winner: {winnerLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {leftName} {judgment.leftScore}/10 · {rightName} {judgment.rightScore}/10
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground">{judgment.summary}</p>
    </div>
  );
}

function fightersMatch(
  leftToolId: string,
  rightToolId: string,
  leftCustom: CustomBattleSkill | null,
  rightCustom: CustomBattleSkill | null,
): boolean {
  if (leftCustom && rightCustom) return leftCustom.content === rightCustom.content;
  if (leftCustom || rightCustom) return false;
  return leftToolId === rightToolId;
}

export function BattlePage({ catalog }: { catalog: Catalog }) {
  const skills = useMemo(
    () =>
      catalog.items
        .filter((item) => item.kind === "skill")
        .slice()
        .sort((a, b) => (b.metadata.stars ?? 0) - (a.metadata.stars ?? 0)),
    [catalog.items],
  );
  const defaults = defaultFighters(skills);
  const [leftToolId, setLeftToolId] = useState(defaults[0].id);
  const [rightToolId, setRightToolId] = useState(defaults[1].id);
  const [leftCustomSkill, setLeftCustomSkill] = useState<CustomBattleSkill | null>(null);
  const [rightCustomSkill, setRightCustomSkill] = useState<CustomBattleSkill | null>(null);
  const [pasteTarget, setPasteTarget] = useState<"left" | "right" | null>(null);
  const [leftModelId, setLeftModelId] = useState<BattleModelId>(defaultBattleModels[0]);
  const [rightModelId, setRightModelId] = useState<BattleModelId>(defaultBattleModels[1]);
  const [draft, setDraft] = useState(defaultBattlePreset.prompt);
  const [activePresetId, setActivePresetId] = useState(defaultBattlePreset.id);
  const [inputKey, setInputKey] = useState(0);
  const [judgment, setJudgment] = useState<BattleJudgment | null>(null);
  const [judging, setJudging] = useState(false);
  const lastJudgedRef = useRef<string | null>(null);

  const leftChat = useBattleChat(leftToolId, leftModelId, "battle-left", leftCustomSkill);
  const rightChat = useBattleChat(rightToolId, rightModelId, "battle-right", rightCustomSkill);

  const left = useMemo(() => skills.find((i) => i.id === leftToolId) ?? skills[0], [skills, leftToolId]);
  const right = useMemo(
    () => skills.find((i) => i.id === rightToolId) ?? skills[1] ?? skills[0],
    [skills, rightToolId],
  );

  const leftDisplayName = leftCustomSkill?.name ?? left.name;
  const rightDisplayName = rightCustomSkill?.name ?? right.name;

  const leftBusy = leftChat.status === "streaming" || leftChat.status === "submitted";
  const rightBusy = rightChat.status === "streaming" || rightChat.status === "submitted";
  const sameTool = fightersMatch(leftToolId, rightToolId, leftCustomSkill, rightCustomSkill);
  const combinedStatus = leftBusy || rightBusy ? (leftBusy && rightBusy ? leftChat.status : "streaming") : "ready";

  useEffect(() => {
    const pending = consumePendingMegaskill();
    if (!pending) return;
    if (pending.side === "right") {
      setRightCustomSkill({ name: pending.name, content: pending.content });
    } else {
      setLeftCustomSkill({ name: pending.name, content: pending.content });
    }
  }, []);

  const applyCustomSkill = useCallback(
    (side: "left" | "right", skill: CustomBattleSkill) => {
      if (side === "left") {
        setLeftCustomSkill(skill);
        leftChat.setMessages([]);
      } else {
        setRightCustomSkill(skill);
        rightChat.setMessages([]);
      }
      setJudgment(null);
      lastJudgedRef.current = null;
    },
    [leftChat, rightChat],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || leftBusy || rightBusy || sameTool) return;

      setJudgment(null);
      lastJudgedRef.current = null;
      void leftChat.sendMessage({ text: trimmed });
      void rightChat.sendMessage({ text: trimmed });
    },
    [leftBusy, rightBusy, sameTool, leftChat, rightChat],
  );

  const resetAll = () => {
    leftChat.setMessages([]);
    rightChat.setMessages([]);
    setDraft(defaultBattlePreset.prompt);
    setLeftToolId(resolveToolId(skills, defaultBattlePreset.leftSlug, skills[0].id));
    setRightToolId(resolveToolId(skills, defaultBattlePreset.rightSlug, skills[1]?.id ?? skills[0].id));
    setLeftCustomSkill(null);
    setRightCustomSkill(null);
    setActivePresetId(defaultBattlePreset.id);
    setJudgment(null);
    lastJudgedRef.current = null;
    setInputKey((k) => k + 1);
  };

  const applyPreset = useCallback(
    (preset: BattlePreset) => {
      leftChat.setMessages([]);
      rightChat.setMessages([]);
      setLeftToolId(resolveToolId(skills, preset.leftSlug, skills[0].id));
      setRightToolId(resolveToolId(skills, preset.rightSlug, skills[1]?.id ?? skills[0].id));
      setLeftCustomSkill(null);
      setRightCustomSkill(null);
      setDraft(preset.prompt);
      setActivePresetId(preset.id);
      setJudgment(null);
      lastJudgedRef.current = null;
      setInputKey((k) => k + 1);
    },
    [skills, leftChat, rightChat],
  );

  useEffect(() => {
    if (leftBusy || rightBusy || sameTool) return;

    const leftAssistant = [...leftChat.messages].reverse().find((m) => m.role === "assistant");
    const rightAssistant = [...rightChat.messages].reverse().find((m) => m.role === "assistant");
    const lastUser = [...leftChat.messages].reverse().find((m) => m.role === "user");

    if (!leftAssistant || !rightAssistant || !lastUser) return;

    const leftText = messageText(leftAssistant);
    const rightText = messageText(rightAssistant);
    if (!leftText.trim() || !rightText.trim()) return;

    const key = `${leftAssistant.id}:${rightAssistant.id}`;
    if (lastJudgedRef.current === key) return;

    lastJudgedRef.current = key;
    setJudging(true);

    void fetch("/api/battle/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: messageText(lastUser),
        leftSkill: leftDisplayName,
        rightSkill: rightDisplayName,
        leftOutput: leftText,
        rightOutput: rightText,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Judge failed");
        return response.json() as Promise<BattleJudgment>;
      })
      .then(setJudgment)
      .catch(() => setJudgment(null))
      .finally(() => setJudging(false));
  }, [leftChat.messages, rightChat.messages, leftBusy, rightBusy, sameTool, leftDisplayName, rightDisplayName]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <PasteMegaskillDialog
        open={pasteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPasteTarget(null);
        }}
        onApply={(skill) => {
          if (pasteTarget) applyCustomSkill(pasteTarget, skill);
          setPasteTarget(null);
        }}
      />
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium">
            <Swords className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">Tool directory</span>
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm text-muted-foreground">Battle</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
            Real SKILL.md · AI Elements
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-border py-3">
          <button
            type="button"
            onClick={resetAll}
            title="New battle"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PresetBar
            presets={battlePresets}
            activeId={activePresetId}
            disabled={leftBusy || rightBusy}
            onSelect={applyPreset}
          />

          <JudgeBar judgment={judgment} judging={judging} leftName={leftDisplayName} rightName={rightDisplayName} />

          {sameTool ? (
            <p className="border-b border-border px-4 py-2 text-center text-xs text-destructive">
              Pick two different skills to compare.
            </p>
          ) : null}

          <div className="flex min-h-0 flex-1">
            <BattlePane
              entry={left}
              displayName={leftDisplayName}
              customSkill={leftCustomSkill}
              modelId={leftModelId}
              options={skills}
              onSelectSkill={(id) => {
                setLeftCustomSkill(null);
                setLeftToolId(id);
              }}
              onSelectModel={setLeftModelId}
              onPasteMegaskill={() => setPasteTarget("left")}
              onClearCustomSkill={() => setLeftCustomSkill(null)}
              messages={leftChat.messages}
              status={leftChat.status}
              error={leftChat.error}
              onReset={() => {
                leftChat.setMessages([]);
                setJudgment(null);
                lastJudgedRef.current = null;
              }}
            />
            <BattlePane
              entry={right}
              displayName={rightDisplayName}
              customSkill={rightCustomSkill}
              modelId={rightModelId}
              options={skills}
              onSelectSkill={(id) => {
                setRightCustomSkill(null);
                setRightToolId(id);
              }}
              onSelectModel={setRightModelId}
              onPasteMegaskill={() => setPasteTarget("right")}
              onClearCustomSkill={() => setRightCustomSkill(null)}
              messages={rightChat.messages}
              status={rightChat.status}
              error={rightChat.error}
              onReset={() => {
                rightChat.setMessages([]);
                setJudgment(null);
                lastJudgedRef.current = null;
              }}
            />
          </div>

          <div className="shrink-0 border-t border-border bg-background p-3">
            <PromptInputProvider key={`${activePresetId}-${inputKey}`} initialInput={draft}>
              <PromptInput
                onSubmit={(message) => sendMessage(message.text)}
                className="mx-auto max-w-3xl"
              >
                <PromptInputBody>
                  <PromptInputTextarea placeholder="Send the same prompt to both skills…" />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputSubmit
                    status={combinedStatus}
                    disabled={sameTool || leftBusy || rightBusy}
                  />
                </PromptInputFooter>
              </PromptInput>
            </PromptInputProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
