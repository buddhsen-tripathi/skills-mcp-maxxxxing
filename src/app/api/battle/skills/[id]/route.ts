import { loadSkillContent, ensureSkillInstalled } from "@/lib/battle-skill-loader";
import { readCatalog } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

async function getSkillEntry(id: string) {
  const catalog = await readCatalog();
  const entry = catalog.items.find((item) => item.id === id);
  if (!entry) return null;
  if (entry.kind !== "skill") return null;
  return entry;
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const entry = await getSkillEntry(id);
  if (!entry) {
    return Response.json({ error: "Skill not found" }, { status: 404 });
  }

  const loaded = await loadSkillContent(entry, { install: false });

  return Response.json({
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    source: loaded.source,
    path: loaded.path,
    bytes: loaded.bytes,
    preview: loaded.preview,
    installed: loaded.installed,
    installError: loaded.installError,
    stubOnly: loaded.source === "catalog",
  });
}

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const entry = await getSkillEntry(id);
  if (!entry) {
    return Response.json({ error: "Skill not found" }, { status: 404 });
  }

  const install = await ensureSkillInstalled(entry);
  const loaded = await loadSkillContent(entry, { install: false });

  return Response.json({
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    source: loaded.source,
    path: loaded.path,
    bytes: loaded.bytes,
    preview: loaded.preview,
    installed: install.installed || loaded.source !== "catalog",
    installError: loaded.source === "catalog" ? install.error ?? loaded.installError : undefined,
    stubOnly: loaded.source === "catalog",
  });
}
