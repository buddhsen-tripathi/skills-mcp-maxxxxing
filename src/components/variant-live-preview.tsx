"use client";

import { LiveError, LivePreview, LiveProvider } from "react-live";

import { cn } from "@/lib/utils";

type VariantLivePreviewProps = {
  code: string;
  className?: string;
};

export function VariantLivePreview({ code, className }: VariantLivePreviewProps) {
  const liveCode = `${code.trim()}\n\nrender(<Variant />);`;

  return (
    <LiveProvider code={liveCode} noInline language="jsx">
      <div className={cn("variant-live-preview", className)}>
        <LivePreview className="min-h-[200px] w-full" />
        <LiveError className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 font-mono text-xs text-destructive whitespace-pre-wrap" />
      </div>
    </LiveProvider>
  );
}
