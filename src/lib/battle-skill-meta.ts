export type SkillMeta = {
  id: string;
  name: string;
  slug: string;
  source: "local" | "remote" | "catalog";
  path: string | null;
  bytes: number;
  preview: string;
  installed: boolean;
  installError?: string;
  stubOnly: boolean;
};

export async function fetchSkillMeta(id: string, refresh = false): Promise<SkillMeta> {
  const response = await fetch(`/api/battle/skills/${id}`, {
    method: refresh ? "POST" : "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to load skill (${response.status})`);
  }

  return response.json() as Promise<SkillMeta>;
}

export function skillSourceLabel(meta: SkillMeta | null): string {
  if (!meta) return "Loading skill…";
  if (meta.stubOnly) return "Catalog stub";
  if (meta.source === "local") return "Local SKILL.md";
  if (meta.source === "remote") return "Remote SKILL.md";
  return "Unknown";
}
