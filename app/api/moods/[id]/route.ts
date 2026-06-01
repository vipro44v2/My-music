import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { DEFAULT_MOODS, type MoodDef } from "@/lib/moods";
import { emitChange } from "@/lib/events";
import { deleteMoodAsset } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdmin()))
      return Response.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json() as { label?: string; icon?: string; overlay?: string; desc?: string };
    const { label, icon, overlay, desc = "" } = body;

    if (!label || !icon || !overlay)
      return Response.json({ error: "label, icon, overlay are required" }, { status: 400 });

    if (DEFAULT_MOODS.find((m) => m.id === id))
      return Response.json({ error: "Cannot edit a default mood" }, { status: 400 });

    const setting = await prisma.setting.findUnique({ where: { key: "custom_moods" } });
    if (!setting)
      return Response.json({ error: "Mood not found" }, { status: 404 });

    const moods = JSON.parse(setting.value) as MoodDef[];
    const idx = moods.findIndex((m) => m.id === id);
    if (idx === -1)
      return Response.json({ error: "Mood not found" }, { status: 404 });

    moods[idx] = { ...moods[idx], label, icon, overlay, desc };
    await prisma.setting.update({
      where: { key: "custom_moods" },
      data: { value: JSON.stringify(moods) },
    });

    emitChange({ type: "moods" });
    return Response.json(moods[idx]);
  } catch (err) {
    console.error("[PUT /api/moods/[id]]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdmin()))
      return Response.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;

    if (DEFAULT_MOODS.find((m) => m.id === id))
      return Response.json({ error: "Cannot delete a default mood" }, { status: 400 });

    const setting = await prisma.setting.findUnique({ where: { key: "custom_moods" } });
    if (setting) {
      const moods = JSON.parse(setting.value) as { id: string }[];
      const updated = moods.filter((m) => m.id !== id);
      await prisma.setting.update({
        where: { key: "custom_moods" },
        data: { value: JSON.stringify(updated) },
      });
    }

    const image = await prisma.moodImage.findUnique({
      where: { id },
      select: { publicId: true, resourceType: true },
    });

    if (image?.publicId) await deleteMoodAsset(image.publicId, image.resourceType).catch(() => {});
    await prisma.moodImage.delete({ where: { id } }).catch(() => {});

    emitChange({ type: "moods" });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/moods/[id]]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
