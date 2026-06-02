import { enrichCatalogInstalls } from "../src/lib/enrich-installs";
import { readCatalog, writeCatalog } from "../src/lib/storage";

const catalog = await readCatalog();
console.log(`Enriching install commands from READMEs for ${catalog.items.length} entries...`);

const enriched = await enrichCatalogInstalls(catalog.items, { force: true });
await writeCatalog({ ...catalog, items: enriched, generatedAt: new Date().toISOString() });

const withCommand = enriched.filter((e) => e.install.command).length;
console.log(`Done. ${withCommand}/${enriched.length} entries have a setup command.`);
