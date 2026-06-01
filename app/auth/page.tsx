import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import AuthForm from "./AuthForm";

export default async function AuthPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 bg-[#0a0805]">
      <img
        src="/8642963.gif"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
