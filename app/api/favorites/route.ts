import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.userId },
    include: { song: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(favorites.map((f) => f.song));
}

export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { songId } = await req.json();
  if (!songId) return Response.json({ error: "Thiếu songId" }, { status: 400 });

  const favorite = await prisma.favorite.upsert({
    where: { userId_songId: { userId: session.userId, songId } },
    update: {},
    create: { userId: session.userId, songId },
  });

  return Response.json(favorite, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { songId } = await req.json();
  if (!songId) return Response.json({ error: "Thiếu songId" }, { status: 400 });

  await prisma.favorite.deleteMany({
    where: { userId: session.userId, songId },
  });

  return Response.json({ ok: true });
}
