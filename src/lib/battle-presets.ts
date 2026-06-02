export type BattlePreset = {
  id: string;
  label: string;
  leftSlug: string;
  rightSlug: string;
  prompt: string;
};

export const battlePresets: BattlePreset[] = [
  {
    id: "design-studio",
    label: "Design studio vs HTML ship",
    leftSlug: "open-design",
    rightSlug: "html-anything",
    prompt: "Design a minimal landing page hero for a developer tools startup. Include headline, subcopy, and a primary CTA.",
  },
  {
    id: "design-polish",
    label: "Full design vs anti-slop",
    leftSlug: "open-design",
    rightSlug: "hallmark",
    prompt: "Review this hero and rewrite it so it feels polished, not generic AI slop: 'Build faster with AI. The all-in-one platform for modern teams.'",
  },
  {
    id: "html-vs-hallmark",
    label: "HTML ship vs anti-slop",
    leftSlug: "html-anything",
    rightSlug: "hallmark",
    prompt: "Create a pricing section for a SaaS product with three tiers. Make it feel intentional, not template-y.",
  },
  {
    id: "agent-skills",
    label: "Engineering skills face-off",
    leftSlug: "agent-skills",
    rightSlug: "graphify",
    prompt: "Plan how to add authenticated API routes to a Next.js App Router app. Give me a step-by-step implementation plan.",
  },
];

export const defaultBattlePreset = battlePresets[0];

export function resolveToolId(items: { id: string; slug: string }[], slug: string, fallbackId: string): string {
  return items.find((item) => item.slug === slug)?.id ?? fallbackId;
}
