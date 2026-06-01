import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { DEFAULT_MOODS, type MoodDef } from "@/lib/moods";
import { emitChange } from "@/lib/events";

export const dynamic = "force-dynamic";

async function getCustomMoods(): Promise<MoodDef[]> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "custom_moods" } });
    if (!setting) return [];
    return JSON.parse(setting.value) as MoodDef[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const custom = await getCustomMoods();
    const defaultIds = new Set(DEFAULT_MOODS.map((m) => m.id));
    const filtered = custom.filter((m) => !defaultIds.has(m.id));
    return Response.json([...DEFAULT_MOODS, ...filtered]);
  } catch {
    return Response.json(DEFAULT_MOODS);
  }
}

export async function POST(req: Request) {
  try {
    if (!(await verifyAdmin()))
      return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json() as {
      id?: string; label?: string; icon?: string; overlay?: string; desc?: string;
    };
    const { id, label, icon, overlay, desc = "" } = body;

    if (!id || !label || !icon || !overlay)
      return Response.json({ error: "id, label, icon, overlay are required" }, { status: 400 });

    if (!/^[a-z0-9-]+$/.test(id) || id.length > 30)
      return Response.json({ error: "id must be lowercase letters, numbers, or hyphens (max 30)" }, { status: 400 });

    const defaultIds = new Set(DEFAULT_MOODS.map((m) => m.id));
    if (defaultIds.has(id))
      return Response.json({ error: "Cannot override a default mood" }, { status: 400 });

    const existing = await getCustomMoods();
    if (existing.find((m) => m.id === id))
      return Response.json({ error: "Mood ID already exists" }, { status: 409 });

    const newMood: MoodDef = { id, label, icon, overlay, desc, isDefault: false };
    const updated = [...existing, newMood];

    await prisma.setting.upsert({
      where: { key: "custom_moods" },
      update: { value: JSON.stringify(updated) },
      create: { key: "custom_moods", value: JSON.stringify(updated) },
    });

    emitChange({ type: "moods" });
    return Response.json(newMood, { status: 201 });
  } catch (err) {
    console.error("[POST /api/moods]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
