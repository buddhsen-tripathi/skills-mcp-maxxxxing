"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useCopyFeedback } from "@/components/use-copy-feedback";
import { cn } from "@/lib/utils";

type CopyFeedbackButtonProps = {
  value: string;
  copyKey: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  copiedLabel?: string;
};

export function CopyFeedbackButton({
  value,
  copyKey,
  children,
  className,
  variant = "outline",
  size = "sm",
  copiedLabel = "Copied",
}: CopyFeedbackButtonProps) {
  const { copy, isCopied } = useCopyFeedback();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className, isCopied(copyKey) && "border-hairline-strong")}
      onClick={() => void copy(value, copyKey)}
      aria-live="polite"
    >
      {isCopied(copyKey) ? copiedLabel : children}
    </Button>
  );
}

type CopyIconButtonProps = {
  value: string;
  copyKey: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

export function CopyIconButton({ value, copyKey, ariaLabel, className, children }: CopyIconButtonProps) {
  const { copy, isCopied } = useCopyFeedback();

  return (
    <button
      type="button"
      className={cn(
        "shrink-0 rounded-sm border border-border p-1 text-muted-foreground hover:text-foreground",
        isCopied(copyKey) && "text-foreground",
        className,
      )}
      onClick={() => void copy(value, copyKey)}
      aria-label={isCopied(copyKey) ? "Copied to clipboard" : ariaLabel}
      aria-live="polite"
      title={isCopied(copyKey) ? "Copied" : ariaLabel}
    >
      {isCopied(copyKey) ? (
        <span className="px-1 text-caption font-medium">Copied</span>
      ) : (
        children
      )}
    </button>
  );
}
