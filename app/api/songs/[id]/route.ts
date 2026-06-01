import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { emitChange } from "@/lib/events";
import { deleteMoodAsset } from "@/lib/cloudinary";
import { unlink } from "fs/promises";
import { join } from "path";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/songs/[id]">
) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await ctx.params;
  const songId = Number(id);
  if (isNaN(songId)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json() as { mood?: string | null };
  const song = await prisma.song.update({
    where: { id: songId },
    data: { mood: body.mood ?? null },
  });

  emitChange({ type: "songs" });
  return Response.json(song);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/songs/[id]">
) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await ctx.params;
  const songId = Number(id);
  if (isNaN(songId)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) return Response.json({ error: "Song not found" }, { status: 404 });

  if (song.cloudinaryPublicId) {
    await deleteMoodAsset(song.cloudinaryPublicId, song.cloudinaryResourceType).catch(() => {});
  } else if (song.src.startsWith("/audio/")) {
    const filePath = join(process.cwd(), "public", song.src);
    await unlink(filePath).catch(() => {}); // ignore if already gone
  }

  await prisma.song.delete({ where: { id: songId } });
  emitChange({ type: "songs" });
  return Response.json({ ok: true });
}
