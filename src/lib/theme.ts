export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

const themeListeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export function getThemeFromDocument(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function disableTransitionsDuringUpdate() {
  const root = document.documentElement;
  root.classList.add("theme-disabled");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-disabled"));
  });
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  disableTransitionsDuringUpdate();
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  notifyThemeListeners();
}

export function toggleTheme() {
  setTheme(getThemeFromDocument() === "dark" ? "light" : "dark");
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="dark"||(s!=="light"&&d);document.documentElement.classList.toggle("dark",t);document.documentElement.style.colorScheme=t?"dark":"light"}catch(e){}})();`;
