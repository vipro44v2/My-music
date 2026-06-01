import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/dal";

export default async function UploadLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  if (!admin) redirect("/");
  return <>{children}</>;
}
