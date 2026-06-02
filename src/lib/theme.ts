export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="dark"||(s!=="light"&&d);document.documentElement.classList.toggle("dark",t);document.documentElement.style.colorScheme=t?"dark":"light"}catch(e){}})();`;
