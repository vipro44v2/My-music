import "server-only";
import { cache } from "react";
import { getSession } from "./session";
import { prisma } from "./prisma";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
});

export const verifyAdmin = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "admin") return null;
  return user;
});
