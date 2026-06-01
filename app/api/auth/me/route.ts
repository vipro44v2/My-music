import { getCurrentUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json(null, { status: 200 });
  return Response.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
