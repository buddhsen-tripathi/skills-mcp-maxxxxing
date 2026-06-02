"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Wrench } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DirectoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const INITIAL_LIMIT = 40;
const SEARCH_LIMIT = 80;

function matchesSkillQuery(entry: DirectoryEntry, query: string): boolean {
  const haystack = [entry.name, entry.slug, entry.summary, ...entry.tags].join(" ").toLowerCase();
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

export function SkillSelector({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: DirectoryEntry[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);

  const visibleOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      const selectedEntry = options.find((option) => option.id === value);
      const top = options.slice(0, INITIAL_LIMIT);
      if (selectedEntry && !top.some((option) => option.id === selectedEntry.id)) {
        return [selectedEntry, ...top].slice(0, INITIAL_LIMIT + 1);
      }
      return top;
    }

    return options.filter((option) => matchesSkillQuery(option, trimmed)).slice(0, SEARCH_LIMIT);
  }, [options, query, value]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 max-w-[200px] min-w-0 gap-2 px-2"
          aria-label="Select skill"
        >
          <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{selected?.name ?? "Select skill"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" showCloseButton>
        <DialogTitle className="sr-only">Select skill</DialogTitle>
        <Command shouldFilter={false} className="rounded-none border-0">
          <CommandInput
            placeholder="Search skills by name, tag, or summary…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No skills match your search.</CommandEmpty>
            <CommandGroup heading={query.trim() ? "Results" : "Popular skills"}>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate font-medium">{option.name}</span>
                    {option.id === value ? <Check className="ml-auto size-4 shrink-0" /> : null}
                  </div>
                  <span className={cn("line-clamp-1 w-full text-xs text-muted-foreground")}>{option.summary}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {!query.trim() && options.length > INITIAL_LIMIT ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Type to search {options.length.toLocaleString()} skills…
              </p>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
