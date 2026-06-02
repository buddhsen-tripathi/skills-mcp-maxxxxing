import { NextResponse } from "next/server";
import { z } from "zod";

import { answerDirectoryQuery } from "@/lib/agent/index";
import { readCatalog } from "@/lib/storage";

const payloadSchema = z.object({
  query: z.string().trim().min(2),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
  }

  const catalog = await readCatalog();
  const response = answerDirectoryQuery(parsed.data.query, catalog);
  return NextResponse.json(response);
}
