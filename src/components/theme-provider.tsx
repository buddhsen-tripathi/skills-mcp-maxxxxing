"use client";

import { useSyncExternalStore } from "react";

import {
  getThemeFromDocument,
  setTheme,
  subscribeTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeFromDocument, () => "light" as Theme);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}

/** Kept for layout compatibility; theme state lives outside React to avoid re-rendering the tree. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return children;
}
