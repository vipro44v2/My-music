import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { songId } = await req.json();
  if (!songId) return Response.json({ error: "Thiếu songId" }, { status: 400 });

  const playlist = await prisma.playlist.findFirst({ where: { id, userId: session.userId } });
  if (!playlist) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  await prisma.playlistSong.deleteMany({ where: { playlistId: id, songId } });
  return Response.json({ ok: true });
}
