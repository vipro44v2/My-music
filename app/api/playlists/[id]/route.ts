import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/playlists/[id]">
) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Tên không được để trống" }, { status: 400 });

  const playlist = await prisma.playlist.updateMany({
    where: { id, userId: session.userId },
    data: { name: name.trim() },
  });
  if (!playlist.count) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/playlists/[id]">
) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;

  await prisma.playlist.deleteMany({ where: { id, userId: session.userId } });
  return Response.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/playlists/[id]">
) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const { songId } = await req.json();
  if (!songId) return Response.json({ error: "Thiếu songId" }, { status: 400 });

  const playlist = await prisma.playlist.findFirst({ where: { id, userId: session.userId } });
  if (!playlist) return Response.json({ error: "Không tìm thấy playlist" }, { status: 404 });

  const entry = await prisma.playlistSong.upsert({
    where: { playlistId_songId: { playlistId: id, songId } },
    update: {},
    create: { playlistId: id, songId },
  });

  return Response.json(entry, { status: 201 });
}
