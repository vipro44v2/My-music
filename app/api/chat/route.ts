import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { emitChange } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  const admin = await verifyAdmin();

  if (admin && targetUserId) {
    // Admin fetching a specific user's conversation → mark user's messages as read
    const messages = await prisma.chatMessage.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    await prisma.chatMessage.updateMany({
      where: { userId: targetUserId, isAdmin: false, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json(messages);
  }

  // Regular user: get their own conversation → mark admin messages as read
  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  await prisma.chatMessage.updateMany({
    where: { userId: session.userId, isAdmin: true, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { content?: string; userId?: string };
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const admin = await verifyAdmin();
  let messageUserId: string;
  let isAdmin = false;

  if (admin && body.userId) {
    messageUserId = body.userId;
    isAdmin = true;
  } else {
    messageUserId = session.userId;
  }

  const message = await prisma.chatMessage.create({
    data: { userId: messageUserId, content, isAdmin },
  });

  emitChange({ type: "chat", userId: messageUserId });
  return NextResponse.json(message);
}
