import { NextResponse } from "next/server";

import { getCatalogMeta } from "@/lib/storage";

export async function GET() {
  const meta = await getCatalogMeta();
  return NextResponse.json(meta);
}
