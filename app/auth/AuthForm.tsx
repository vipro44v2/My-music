"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, Music2 } from "lucide-react";
import Link from "next/link";
import type { UserInfo } from "@/components/TopBar";

type Mode = "login" | "register";

const input =
  "w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors";

interface AuthFormProps {
  embedded?: boolean;
  initialMode?: Mode;
  onCancel?: () => void;
  onSuccess?: (user: UserInfo) => void;
}

export default function AuthForm({ embedded = false, initialMode, onCancel, onSuccess }: AuthFormProps = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    initialMode ?? (params.get("mode") === "register" ? "register" : "login")
  );

  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, name: form.name || undefined, password: form.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (onSuccess) {
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        const currentUser = await me.json();
        if (currentUser) onSuccess(currentUser as UserInfo);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "relative z-10 w-full" : "relative z-10 w-full max-w-[360px]"}>
      <div
        className="rounded-3xl border border-white/10 p-8"
        style={{ background: embedded ? "rgba(7,10,8,0.94)" : "rgba(15,12,9,0.75)", backdropFilter: "blur(24px)" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 mb-4">
            <Music2 size={24} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">Gibli Chill</h1>
          <p className="text-white/40 text-sm mt-1">
            {mode === "login" ? "Welcome back" : "Create a new account"}
          </p>
        </div>

        {/* Tab */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.06)" }}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? "bg-white/12 text-white shadow-sm"
                  : "text-white/40 hover:text-white/65"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Display name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              className={input}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            autoComplete="email"
            className={input}
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={`${input} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-rose-400 text-xs px-1 pt-0.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-200 text-sm font-semibold hover:bg-teal-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading
              ? "Processing..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        {embedded && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-white/25 text-xs hover:text-white/50 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        <div className={embedded ? "hidden" : "mt-6 text-center"}>
          <Link
            href="/"
            className="text-white/25 text-xs hover:text-white/50 transition-colors"
          >
              ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
