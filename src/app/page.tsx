import { CatalogPage } from "@/components/catalog-page";
import { readCatalog } from "@/lib/storage";

export default async function Home() {
  const catalog = await readCatalog();
  return <CatalogPage initialCatalog={catalog} />;
}
