import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/dal";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const admin = await verifyAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminDashboard />;
}
