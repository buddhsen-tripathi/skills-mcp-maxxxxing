import { promises as fs } from "node:fs";
import path from "node:path";

import { catalogSchema } from "@/lib/catalog-schema";
import { normalizeCatalog } from "@/lib/catalog-normalize";
import { seedCatalog } from "@/data/seed";
import type { Catalog, CatalogMeta, LegacyDirectoryEntry } from "@/lib/types";

/** Local JSON file on disk (committed after scrape runs). Not a database. */
export const CATALOG_STORE_PATH = path.join(process.cwd(), "src", "data", "catalog.json");

export async function readCatalog(): Promise<Catalog> {
  try {
    const raw = await fs.readFile(CATALOG_STORE_PATH, "utf8");
    const json = JSON.parse(raw) as { generatedAt: string; items: LegacyDirectoryEntry[] };
    const items = normalizeCatalog(json.items ?? []);
    const catalog: Catalog = {
      generatedAt: json.generatedAt ?? new Date().toISOString(),
      items,
    };
    const parsed = catalogSchema.safeParse(catalog);
    if (parsed.success) return parsed.data;
    await writeCatalog(seedCatalog);
    return seedCatalog;
  } catch {
    await writeCatalog(seedCatalog);
    return seedCatalog;
  }
}

export async function writeCatalog(catalog: Catalog): Promise<void> {
  const normalized: Catalog = {
    generatedAt: catalog.generatedAt,
    items: normalizeCatalog(catalog.items as unknown as LegacyDirectoryEntry[]),
  };
  const validated = catalogSchema.parse(normalized);
  await fs.writeFile(CATALOG_STORE_PATH, JSON.stringify(validated, null, 2), "utf8");
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  const catalog = await readCatalog();
  const kinds = { skill: 0, mcp: 0, plugin: 0 } as CatalogMeta["kinds"];
  for (const item of catalog.items) kinds[item.kind] += 1;

  return {
    storePath: "src/data/catalog.json",
    itemCount: catalog.items.length,
    generatedAt: catalog.generatedAt,
    kinds,
  };
}
