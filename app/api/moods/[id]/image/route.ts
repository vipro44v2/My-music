import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { emitChange } from "@/lib/events";
import { deleteMoodAsset, uploadMoodAsset } from "@/lib/cloudinary";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/moods/[id]/image">
) {
  try {
    const { id } = await ctx.params;

    const image = await prisma.moodImage.findUnique({ where: { id } });
    if (!image) return new Response("Not found", { status: 404 });

    const ifNoneMatch = req.headers.get("if-none-match");
    const etag = `"${image.updatedAt.getTime()}"`;
    if (ifNoneMatch === etag)
      return new Response(null, { status: 304 });

    if (!image.url) {
      if (!image.data) return new Response("Not found", { status: 404 });

      return new Response(image.data, {
        headers: {
          "Content-Type": image.mimeType,
          "Cache-Control": "public, max-age=604800",
          ETag: etag,
        },
      });
    }

    return Response.redirect(image.url, 302);
  } catch (err) {
    console.error("[GET /api/moods/[id]/image]", err);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/moods/[id]/image">
) {
  try {
    if (!(await verifyAdmin()))
      return Response.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await ctx.params;
    if (!/^[a-z0-9-]+$/.test(id) || id.length > 30)
      return Response.json({ error: "Invalid mood id" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "Missing file" }, { status: 400 });
    const mimeType = file.type || "image/jpeg";
    const isAllowedMedia = mimeType.startsWith("image/") || mimeType === "video/mp4";
    if (!isAllowedMedia)
      return Response.json({ error: "Use JPG, PNG, WebP, GIF, or MP4" }, { status: 400 });
    if (file.size > 50 * 1024 * 1024)
      return Response.json({ error: "Background must not exceed 50MB" }, { status: 400 });

    const data = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const previous = await prisma.moodImage.findUnique({
      where: { id },
      select: { publicId: true, resourceType: true },
    });

    const asset = await uploadMoodAsset(id, file, data);

    await prisma.moodImage.upsert({
      where: { id },
      update: {
        data: null,
        publicId: asset.publicId,
        url: asset.url,
        resourceType: asset.resourceType,
        mimeType,
        size: asset.bytes || file.size,
        updatedAt: now,
      },
      create: {
        id,
        data: null,
        publicId: asset.publicId,
        url: asset.url,
        resourceType: asset.resourceType,
        mimeType,
        size: asset.bytes || file.size,
        updatedAt: now,
      },
    });

    if (previous?.publicId && previous.publicId !== asset.publicId) {
      await deleteMoodAsset(previous.publicId, previous.resourceType).catch((err) =>
        console.warn("[Cloudinary delete old mood image]", err)
      );
    }

    emitChange({ type: "moods" });
    const mediaType = mimeType.startsWith("video/") ? "video" : "image";
    return Response.json({ src: `/api/moods/${id}/image?v=${now.getTime()}&media=${mediaType}` });
  } catch (err) {
    console.error("[POST /api/moods/[id]/image]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/moods/[id]/image">
) {
  try {
    if (!(await verifyAdmin()))
      return Response.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await ctx.params;

    const image = await prisma.moodImage.findUnique({
      where: { id },
      select: { publicId: true, resourceType: true },
    });

    if (image?.publicId) await deleteMoodAsset(image.publicId, image.resourceType).catch(() => {});
    await prisma.moodImage.delete({ where: { id } }).catch(() => {});
    emitChange({ type: "moods" });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/moods/[id]/image]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
