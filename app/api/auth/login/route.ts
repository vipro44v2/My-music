import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
}
