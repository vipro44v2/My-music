import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ count: 0 });

  const count = await prisma.chatMessage.count({
    where: { userId: session.userId, isAdmin: true, isRead: false },
  });
  return NextResponse.json({ count });
}
