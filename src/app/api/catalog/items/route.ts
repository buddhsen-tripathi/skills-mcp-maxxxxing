import { NextResponse } from "next/server";

import { readCatalog } from "@/lib/storage";

export async function GET() {
  const catalog = await readCatalog();
  return NextResponse.json(catalog);
}
