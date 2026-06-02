export type CustomBattleSkill = {
  name: string;
  content: string;
};

export type PendingBattleMegaskill = CustomBattleSkill & {
  side: "left" | "right";
};

export const BATTLE_MEGASKILL_KEY = "battle-pending-megaskill";

export function parseSkillNameFromMarkdown(markdown: string, fallback = "Pasted megaskill"): string {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatter) {
    const nameMatch = frontmatter[1].match(/^name:\s*(.+)$/m);
    if (nameMatch?.[1]) return nameMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  const heading = markdown.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();

  return fallback;
}

export function storePendingMegaskill(skill: CustomBattleSkill, side: "left" | "right" = "left") {
  if (typeof window === "undefined") return;
  const payload: PendingBattleMegaskill = { ...skill, side };
  sessionStorage.setItem(BATTLE_MEGASKILL_KEY, JSON.stringify(payload));
}

export function consumePendingMegaskill(): PendingBattleMegaskill | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BATTLE_MEGASKILL_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(BATTLE_MEGASKILL_KEY);
  try {
    return JSON.parse(raw) as PendingBattleMegaskill;
  } catch {
    return null;
  }
}
