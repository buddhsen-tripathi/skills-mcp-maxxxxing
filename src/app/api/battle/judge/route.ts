import { generateText, Output } from "ai";

import { battleJudgmentSchema } from "@/lib/battle-judgment";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prompt: string;
    leftSkill: string;
    rightSkill: string;
    leftOutput: string;
    rightOutput: string;
  };

  const { prompt, leftSkill, rightSkill, leftOutput, rightOutput } = body;

  if (!prompt || !leftSkill || !rightSkill || !leftOutput || !rightOutput) {
    return Response.json({ error: "prompt, skills, and both outputs are required" }, { status: 400 });
  }

  const result = await generateText({
    model: "openai/gpt-5.4-mini",
    output: Output.object({ schema: battleJudgmentSchema }),
    prompt: `You are judging a skill battle. Two coding agents answered the same user task with different skills loaded.

User task:
${prompt}

Left skill (${leftSkill}):
${leftOutput}

Right skill (${rightSkill}):
${rightOutput}

Score each output 1-10 on: task completion, skill fidelity, specificity, and usefulness.
Pick left, right, or tie. Be concise and concrete.`,
  });

  return Response.json(result.output);
}
