import { randomUUID } from "node:crypto";
import { verifyAdmin } from "@/lib/dal";
import { createCloudinaryUploadSignature } from "@/lib/cloudinary";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/moods/[id]/image-sign">
) {
  if (!(await verifyAdmin())) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await ctx.params;
  if (!/^[a-z0-9-]+$/.test(id) || id.length > 30) {
    return Response.json({ error: "Invalid mood id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  } | null;

  const fileName = body?.fileName ?? "";
  const mimeType = body?.fileType || "image/jpeg";
  const fileSize = Number(body?.fileSize ?? 0);
  const isAllowedMedia = mimeType.startsWith("image/") || mimeType === "video/mp4";

  if (!fileName) return Response.json({ error: "Missing file name" }, { status: 400 });
  if (!isAllowedMedia) return Response.json({ error: "Use JPG, PNG, WebP, GIF, or MP4" }, { status: 400 });
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 50 * 1024 * 1024) {
    return Response.json({ error: "Background must not exceed 50MB" }, { status: 400 });
  }

  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "web-chill/moods";
  const publicId = `${id}-${randomUUID()}`;
  const resourceType = mimeType.startsWith("video/") ? "video" : "image";

  return Response.json({
    ...createCloudinaryUploadSignature(folder, publicId),
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
  });
}
