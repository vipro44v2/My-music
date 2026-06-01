import AppShell from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

export default async function Home() {
  const [moodImageRows, songs, user] = await Promise.all([
    prisma.moodImage.findMany({ select: { id: true, updatedAt: true, mimeType: true } }),
    prisma.song.findMany({ orderBy: { id: "asc" } }),
    getCurrentUser(),
  ]);

  const moodImages: Record<string, string> = {};
  for (const { id, updatedAt, mimeType } of moodImageRows) {
    const mediaType = mimeType.startsWith("video/") ? "video" : "image";
    moodImages[id] = `/api/moods/${id}/image?v=${updatedAt.getTime()}&media=${mediaType}`;
  }

  return (
    <div className="h-dvh w-full max-w-dvw overflow-hidden relative bg-[#070a08]">
      <AppShell initialMoodImages={moodImages} songs={songs} user={user} />

      <div className="hidden lg:flex fixed bottom-[76px] left-0 right-0 justify-center pointer-events-none z-10">
        <p className="text-white/28 text-[11px] tracking-[0.2em] select-none">
        </p>
      </div>
    </div>
  );
}
