import { randomUUID } from "node:crypto";
import { verifyAdmin } from "@/lib/dal";
import { createCloudinaryUploadSignature } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"];
const MAX_SIZE_MB = 50;

export async function POST(req: Request) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null) as {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  } | null;

  const fileName = body?.fileName ?? "";
  const fileType = body?.fileType ?? "";
  const fileSize = Number(body?.fileSize ?? 0);

  if (!fileName) return Response.json({ error: "Missing file name" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(fileType) && !fileName.match(/\.(mp3|wav|ogg|flac|aac)$/i)) {
    return Response.json({ error: "Only audio files are accepted (mp3, wav, ogg, flac, aac)" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `File must not exceed ${MAX_SIZE_MB}MB` }, { status: 400 });
  }

  const folder = process.env.CLOUDINARY_AUDIO_FOLDER || "web-chill/audio";
  const publicId = `${Date.now()}-${randomUUID()}`;

  return Response.json({
    ...createCloudinaryUploadSignature(folder, publicId),
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
  });
}
