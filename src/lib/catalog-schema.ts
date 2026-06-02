import { z } from "zod";

const linksSchema = z.object({
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  docs: z.string().url().optional(),
  llmsTxt: z.string().url().optional(),
  designMd: z.string().url().optional(),
});

export const directoryEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(2).max(120),
  kind: z.enum(["skill", "mcp", "plugin"]),
  summary: z.string().min(12).max(220),
  description: z.string().min(12).max(420),
  tags: z.array(z.string().min(2).max(40)).min(1).max(8),
  metadata: z.object({
    author: z.string().max(80).optional(),
    stars: z.number().int().nonnegative().optional(),
  }),
  links: linksSchema,
  install: z.object({
    method: z.enum(["npm", "git", "manual"]),
    command: z.string().min(3).max(280).nullable(),
    agentPrompt: z.string().min(12).max(500),
  }),
  source: z.object({
    type: z.enum(["github", "website", "manual"]),
    url: z.string().url().optional(),
    repo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).optional(),
  }),
  updatedAt: z.string().datetime(),
});

export const catalogSchema = z.object({
  generatedAt: z.string().datetime(),
  items: z.array(directoryEntrySchema),
});

export type CatalogSchema = z.infer<typeof catalogSchema>;
