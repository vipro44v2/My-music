import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { chatMessages: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, isAdmin: true },
      },
      _count: {
        select: {
          chatMessages: { where: { isAdmin: false, isRead: false } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      lastMessage: u.chatMessages[0] ?? null,
      unreadCount: u._count.chatMessages,
    }))
  );
}
