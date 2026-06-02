import { NextResponse } from "next/server";

import { runScraperAgents } from "@/lib/scrapers";
import { readCatalog, writeCatalog } from "@/lib/storage";

export async function POST() {
  const existing = await readCatalog();
  const refreshed = await runScraperAgents(existing);
  await writeCatalog(refreshed);
  return NextResponse.json(refreshed);
}
