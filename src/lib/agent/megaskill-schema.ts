import { z } from "zod";

export const megaskillDraftSchema = z.object({
  name: z
    .string()
    .describe("Skill slug: lowercase letters, numbers, hyphens only, max 64 chars"),
  title: z.string().describe("Human-readable skill title"),
  description: z
    .string()
    .describe("Third-person description for SKILL.md frontmatter: what it does and when to use it, max 500 chars"),
  overview: z.string().describe("2-3 sentences explaining this megaskill workflow"),
  whenToUse: z.array(z.string()).min(1).max(6).describe("Trigger scenarios"),
  workflowSteps: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().describe("Actionable instructions for the coding agent"),
        toolIds: z.array(z.string()).describe("Catalog entry ids used in this step, can be empty"),
      }),
    )
    .min(2)
    .max(8),
  verification: z.array(z.string()).min(1).max(5).describe("How to verify setup worked"),
});

export type MegaskillDraft = z.infer<typeof megaskillDraftSchema>;
