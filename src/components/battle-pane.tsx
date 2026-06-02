"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isReasoningUIPart, isTextUIPart, type UIMessage } from "ai";
import { ChevronDown, Copy, RotateCcw, Wrench } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { JSXPreview, JSXPreviewContent, JSXPreviewError } from "@/components/ai-elements/jsx-preview";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { battleModels, type BattleModelId } from "@/lib/battle-models";
import { extractVariantJsx, messageText as partsToText } from "@/lib/battle-react-extract";
import { fetchSkillMeta, skillSourceLabel, type SkillMeta } from "@/lib/battle-skill-meta";
import type { DirectoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function messageText(message: UIMessage): string {
  return partsToText(message.parts);
}

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

function SkillSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: DirectoryEntry[];
  onChange: (id: string) => void;
}) {
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Select skill"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="inline-flex max-w-full items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:bg-muted">
        <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{selected?.name ?? "Select skill"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

function SkillLoadBadge({ meta, loading }: { meta: SkillMeta | null; loading: boolean }) {
  const label = loading ? "Installing…" : skillSourceLabel(meta);
  const stub = meta?.stubOnly;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
        stub ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function BattleModelPicker({ value, onChange }: { value: BattleModelId; onChange: (id: BattleModelId) => void }) {
  const selected = battleModels.find((m) => m.id === value) ?? battleModels[0];
  const provider = selected.id.split("/")[0] as "openai" | "anthropic";

  return (
    <ModelSelector>
      <ModelSelectorTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
          <ModelSelectorLogo provider={provider} />
          <ModelSelectorName>{selected.label}</ModelSelectorName>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Select model">
        <ModelSelectorInput placeholder="Search models…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Models">
            {battleModels.map((model) => (
              <ModelSelectorItem key={model.id} value={model.id} onSelect={() => onChange(model.id)}>
                <ModelSelectorLogo provider={model.id.split("/")[0] as "openai" | "anthropic"} />
                <ModelSelectorName>{model.label}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

function BattleMessage({ message, streaming }: { message: UIMessage; streaming?: boolean }) {
  const textParts = message.parts.filter((part) => isTextUIPart(part));
  const reasoningParts = message.parts.filter((part) => isReasoningUIPart(part));

  return (
    <Message from={message.role}>
      <MessageContent>
        {reasoningParts.map((part, index) =>
          isReasoningUIPart(part) && part.text ? (
            <Reasoning key={`${message.id}-reasoning-${index}`} isStreaming={streaming}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          ) : null,
        )}
        {textParts.map((part, index) =>
          isTextUIPart(part) ? (
            message.role === "user" ? (
              <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : (
              <MessageResponse key={`${message.id}-text-${index}`} isAnimating={streaming}>
                {part.text}
              </MessageResponse>
            )
          ) : null,
        )}
      </MessageContent>
      {message.role === "assistant" && messageText(message) ? (
        <MessageActions>
          <MessageAction tooltip="Copy" onClick={() => copyText(messageText(message))}>
            <Copy className="size-3.5" />
          </MessageAction>
        </MessageActions>
      ) : null}
    </Message>
  );
}

export function useBattleChat(toolId: string, modelId: BattleModelId, chatId: string) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/battle/chat",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            ...body,
            messages,
            id,
            toolId,
            model: modelId,
          },
        }),
      }),
    [toolId, modelId],
  );

  return useChat({
    id: chatId,
    transport,
    experimental_throttle: 50,
  });
}

export function BattlePane({
  entry,
  modelId,
  options,
  onSelectSkill,
  onSelectModel,
  messages,
  status,
  error,
  onReset,
}: {
  entry: DirectoryEntry;
  modelId: BattleModelId;
  options: DirectoryEntry[];
  onSelectSkill: (id: string) => void;
  onSelectModel: (id: BattleModelId) => void;
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  onReset: () => void;
}) {
  const [skillMeta, setSkillMeta] = useState<SkillMeta | null>(null);
  const [skillLoading, setSkillLoading] = useState(false);

  const isStreaming = status === "streaming" || status === "submitted";
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantText = lastAssistant ? messageText(lastAssistant) : "";
  const variantJsx = lastAssistantText ? extractVariantJsx(lastAssistantText, isStreaming) : null;

  useEffect(() => {
    let cancelled = false;
    setSkillLoading(true);
    void fetchSkillMeta(entry.id, true)
      .then((meta) => {
        if (!cancelled) setSkillMeta(meta);
      })
      .catch(() => {
        if (!cancelled) setSkillMeta(null);
      })
      .finally(() => {
        if (!cancelled) setSkillLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry.id]);

  const refreshSkill = useCallback(() => {
    setSkillLoading(true);
    void fetchSkillMeta(entry.id, true)
      .then(setSkillMeta)
      .finally(() => setSkillLoading(false));
  }, [entry.id]);

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border last:border-r-0">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <SkillSelect value={entry.id} options={options} onChange={onSelectSkill} />
          <BattleModelPicker value={modelId} onChange={onSelectModel} />
          <SkillLoadBadge meta={skillMeta} loading={skillLoading} />
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onReset} title="Reset pane">
          <RotateCcw className="size-4" />
        </Button>
      </header>

      <Collapsible className="border-b border-border px-3 py-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-xs text-muted-foreground">
          <span>Loaded skill instructions</span>
          <ChevronDown className="size-3.5" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-muted/30 p-2">
          {skillLoading ? (
            <p className="text-xs text-muted-foreground">Installing and loading SKILL.md…</p>
          ) : skillMeta ? (
            <div className="space-y-1">
              {skillMeta.path ? <p className="font-mono text-[10px] text-muted-foreground">{skillMeta.path}</p> : null}
              {skillMeta.installError ? <p className="text-xs text-destructive">{skillMeta.installError}</p> : null}
              <pre className="whitespace-pre-wrap text-xs text-foreground">{skillMeta.preview}</pre>
              <Button variant="outline" size="sm" className="mt-2 h-7" onClick={refreshSkill}>
                Refresh skill
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Skill metadata unavailable.</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="min-h-[240px] flex-1 overflow-auto border-b border-border bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%,var(--muted)),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%,var(--muted))] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4">
        {variantJsx ? (
          <JSXPreview jsx={variantJsx} isStreaming={isStreaming} className="mx-auto max-w-lg rounded-xl border border-border bg-background p-4 shadow-sm">
            <JSXPreviewContent />
            <JSXPreviewError />
          </JSXPreview>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              {isStreaming ? `Generating variant with ${entry.name}…` : `Run a prompt to preview a React variant shaped by ${entry.name}.`}
            </p>
          </div>
        )}
      </div>

      <Collapsible defaultOpen={false} className="flex min-h-0 max-h-56 flex-col">
        <CollapsibleTrigger className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 text-left text-xs text-muted-foreground">
          <span>Transcript</span>
          <ChevronDown className="size-3.5" />
        </CollapsibleTrigger>
        <CollapsibleContent className="min-h-0 flex-1 overflow-hidden">
          <Conversation className="h-48">
            <ConversationContent className="gap-4 p-3">
              {messages.length === 0 ? (
                <ConversationEmptyState title="No messages" description="Responses appear here after you send a prompt." />
              ) : (
                messages.map((message) => (
                  <BattleMessage
                    key={message.id}
                    message={message}
                    streaming={message.role === "assistant" && isStreaming && message === messages.at(-1)}
                  />
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </CollapsibleContent>
      </Collapsible>

      {error ? (
        <p className="border-t border-border px-3 py-2 text-center text-xs text-destructive">
          {error.message.includes("401") || error.message.includes("403")
            ? "Set AI_GATEWAY_API_KEY in .env.local to stream responses."
            : error.message}
        </p>
      ) : null}
    </section>
  );
}

export { messageText };
