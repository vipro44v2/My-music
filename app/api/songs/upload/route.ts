import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { emitChange } from "@/lib/events";
import { uploadSongAsset } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"];
const MAX_SIZE_MB = 50;

export async function POST(req: Request) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  const formData = await req.formData();

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim();
  const artist = (formData.get("artist") as string | null)?.trim();
  const duration = (formData.get("duration") as string | null)?.trim() || "0:00";
  const mood = (formData.get("mood") as string | null)?.trim() || null;

  if (!file) return Response.json({ error: "Missing audio file" }, { status: 400 });
  if (!title) return Response.json({ error: "Missing song title" }, { status: 400 });
  if (!artist) return Response.json({ error: "Missing artist name" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac|aac)$/i)) {
    return Response.json({ error: "Only audio files are accepted (mp3, wav, ogg, flac, aac)" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `File must not exceed ${MAX_SIZE_MB}MB` }, { status: 400 });
  }

  const body = Buffer.from(await file.arrayBuffer());
  const tempSongId = Date.now();
  const asset = await uploadSongAsset(tempSongId, file, body);

  const song = await prisma.song.create({
    data: {
      title,
      artist,
      duration,
      src: asset.url,
      mood: mood || null,
      cloudinaryPublicId: asset.publicId,
      cloudinaryResourceType: asset.resourceType,
    },
  });

  emitChange({ type: "songs" });
  return Response.json(song, { status: 201 });
}
