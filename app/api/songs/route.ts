import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { emitChange } from "@/lib/events";

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

export async function POST(req: Request) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null) as {
    title?: string;
    artist?: string;
    duration?: string;
    mood?: string | null;
    src?: string;
    cloudinaryPublicId?: string;
    cloudinaryResourceType?: string;
  } | null;

  const title = body?.title?.trim();
  const artist = body?.artist?.trim();
  const duration = body?.duration?.trim() || "0:00";
  const mood = body?.mood?.trim() || null;
  const src = body?.src?.trim();
  const cloudinaryPublicId = body?.cloudinaryPublicId?.trim();
  const cloudinaryResourceType = body?.cloudinaryResourceType?.trim() || "video";

  if (!title) return Response.json({ error: "Missing song title" }, { status: 400 });
  if (!artist) return Response.json({ error: "Missing artist name" }, { status: 400 });
  if (!src) return Response.json({ error: "Missing song URL" }, { status: 400 });
  if (!cloudinaryPublicId) return Response.json({ error: "Missing Cloudinary public ID" }, { status: 400 });

  const song = await prisma.song.create({
    data: {
      title,
      artist,
      duration,
      src,
      mood,
      cloudinaryPublicId,
      cloudinaryResourceType,
    },
  });

  emitChange({ type: "songs" });
  return Response.json(song, { status: 201 });
}
