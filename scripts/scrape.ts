import { runScraperAgents } from "../src/lib/scrapers";
import { readCatalog, writeCatalog } from "../src/lib/storage";

const current = await readCatalog();
const next = await runScraperAgents(current);
await writeCatalog(next);

const counts = next.items.reduce(
  (acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

console.log(`Wrote ${next.items.length} entries to src/data/catalog.json`);
console.log(counts);
