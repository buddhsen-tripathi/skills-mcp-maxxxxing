import { z } from "zod";

export const llmSelectionSchema = z.object({
  summary: z.string().describe("2-3 sentences explaining the recommended stack for the user's goal"),
  picks: z
    .array(
      z.object({
        id: z.string().describe("Must match a catalog entry id exactly"),
        why: z.string().describe("One clear sentence on why this tool fits the user's goal"),
      }),
    )
    .min(1)
    .max(6),
});

export type LlmSelection = z.infer<typeof llmSelectionSchema>;
