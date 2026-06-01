import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mood = searchParams.get("mood");
    const songs = await prisma.song.findMany({
      where: mood ? { mood } : undefined,
      orderBy: { id: "asc" },
    });
    return Response.json(songs);
  } catch (err) {
    console.error("[GET /api/songs]", err);
    return Response.json([], { status: 500 });
  }
}
