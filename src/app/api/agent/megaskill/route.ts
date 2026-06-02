import { NextResponse } from "next/server";
import { z } from "zod";

import { buildMegaskillWithLlm } from "@/lib/agent/megaskill";
import { readCatalog } from "@/lib/storage";
import type { AgentPlanStep } from "@/lib/types";

const payloadSchema = z.object({
  query: z.string().trim().min(2).max(2000),
  plan: z.array(
    z.object({
      entryId: z.string(),
      name: z.string(),
      kind: z.enum(["skill", "mcp", "plugin"]),
      why: z.string(),
      command: z.string().nullable(),
      agentPrompt: z.string(),
    }),
  ),
});

/** Regenerate megaskill from an existing agent plan without re-running tool selection. */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid megaskill request." }, { status: 400 });
  }

  const catalog = await readCatalog();
  const plan = parsed.data.plan as AgentPlanStep[];
  const recommended = plan
    .map((step) => catalog.items.find((item) => item.id === step.entryId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const megaskill = await buildMegaskillWithLlm(parsed.data.query, plan, recommended.length > 0 ? recommended : catalog.items.slice(0, 5));

  return NextResponse.json({ megaskill });
}
