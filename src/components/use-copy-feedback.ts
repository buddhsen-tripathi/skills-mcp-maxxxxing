"use client";

import { useCallback, useState } from "react";

export function useCopyFeedback(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    async (value: string, key: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedKey(key);
        window.setTimeout(() => {
          setCopiedKey((current) => (current === key ? null : current));
        }, resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  const isCopied = useCallback((key: string) => copiedKey === key, [copiedKey]);

  return { copy, isCopied, copiedKey };
}
