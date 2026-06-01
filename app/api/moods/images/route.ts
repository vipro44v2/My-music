import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await prisma.moodImage.findMany({ select: { id: true, updatedAt: true, mimeType: true } });

    const urls: Record<string, string> = {};
    for (const { id, updatedAt, mimeType } of images) {
      const mediaType = mimeType.startsWith("video/") ? "video" : "image";
      urls[id] = `/api/moods/${id}/image?v=${updatedAt.getTime()}&media=${mediaType}`;
    }

    return Response.json(urls);
  } catch (err) {
    console.error("[GET /api/moods/images]", err);
    return Response.json({});
  }
}
