import { z } from "zod";

export const battleJudgmentSchema = z.object({
  winner: z.enum(["left", "right", "tie"]),
  leftScore: z.number().min(1).max(10),
  rightScore: z.number().min(1).max(10),
  summary: z.string(),
  leftStrengths: z.array(z.string()),
  rightStrengths: z.array(z.string()),
  leftWeaknesses: z.array(z.string()),
  rightWeaknesses: z.array(z.string()),
});

export type BattleJudgment = z.infer<typeof battleJudgmentSchema>;
