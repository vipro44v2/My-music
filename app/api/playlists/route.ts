import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const playlists = await prisma.playlist.findMany({
    where: { userId: session.userId },
    include: { songs: { include: { song: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(playlists);
}

export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return Response.json({ error: "Thiếu tên playlist" }, { status: 400 });

  const playlist = await prisma.playlist.create({
    data: { name, userId: session.userId },
  });

  return Response.json(playlist, { status: 201 });
}
