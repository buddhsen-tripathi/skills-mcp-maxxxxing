import { promises as fs } from "node:fs";
import path from "node:path";

import { normalizeCatalog } from "../src/lib/catalog-normalize";
import { enrichCatalogInstalls } from "../src/lib/enrich-installs";
import { catalogSchema } from "../src/lib/catalog-schema";
import type { LegacyDirectoryEntry } from "../src/lib/types";

const STORE = path.join(process.cwd(), "src", "data", "catalog.json");

const raw = await fs.readFile(STORE, "utf8");
const json = JSON.parse(raw) as { generatedAt: string; items: LegacyDirectoryEntry[] };

const normalized = normalizeCatalog(json.items);
console.log(`Enriching install commands from READMEs (${normalized.length} entries)...`);
const items = await enrichCatalogInstalls(normalized);
const catalog = catalogSchema.parse({
  generatedAt: new Date().toISOString(),
  items,
});

await fs.writeFile(STORE, JSON.stringify(catalog, null, 2), "utf8");

const counts = items.reduce(
  (acc, item) => {
    acc[item.kind] += 1;
    return acc;
  },
  { skill: 0, mcp: 0, plugin: 0 },
);

console.log(`Normalized ${items.length} entries → src/data/catalog.json`);
console.log(counts);
