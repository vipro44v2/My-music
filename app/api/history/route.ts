import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const history = await prisma.listeningHistory.findMany({
    where: { userId: session.userId },
    include: { song: true },
    orderBy: { playedAt: "desc" },
    take: 50,
  });

  return Response.json(history);
}

export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { songId } = await req.json();
  if (!songId) return Response.json({ error: "Thiếu songId" }, { status: 400 });

  const entry = await prisma.listeningHistory.create({
    data: { userId: session.userId, songId },
  });

  return Response.json(entry, { status: 201 });
}
