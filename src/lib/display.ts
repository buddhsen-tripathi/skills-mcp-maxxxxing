import type { DirectoryEntry } from "@/lib/types";

export function entrySummary(entry: DirectoryEntry): string {
  return entry.summary;
}

export function entryLink(entry: DirectoryEntry): string | undefined {
  return entry.links.repository ?? entry.links.homepage ?? entry.links.docs ?? entry.source.url;
}

export function formatCatalogCount(total: number): string {
  return `${total.toLocaleString()} tools indexed`;
}

export function formatInstallCommand(entry: DirectoryEntry): string {
  if (entry.install.command) return entry.install.command;
  return `See docs: ${entryLink(entry) ?? "linked source"}`;
}
