import { BattlePage } from "@/components/battle-page";
import { readCatalog } from "@/lib/storage";

export const metadata = {
  title: "Tool battle | Skills, MCP, plugins",
  description: "Prototype: compare two tools head-to-head.",
};

export default async function BattleRoute() {
  const catalog = await readCatalog();
  return <BattlePage catalog={catalog} />;
}
