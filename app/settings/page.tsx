"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Cloud, BookOpen, CloudRain, Moon, Leaf,
  Upload, Trash2, Loader2, Check, ArrowLeft, Settings,
} from "lucide-react";

const MOODS = [
  { id: "chill",  label: "Chill",  icon: Cloud,     tint: "from-sky-800/80 to-teal-900/90" },
  { id: "study",  label: "Study",  icon: BookOpen,  tint: "from-amber-800/80 to-orange-900/90" },
  { id: "rainy",  label: "Rainy",  icon: CloudRain, tint: "from-slate-800/80 to-blue-900/90" },
  { id: "sleep",  label: "Sleep",  icon: Moon,      tint: "from-indigo-800/80 to-purple-900/90" },
  { id: "nature", label: "Nature", icon: Leaf,       tint: "from-green-800/80 to-emerald-900/90" },
];

type Status = "idle" | "uploading" | "done" | "error";

interface MoodState {
  src: string | null;
  preview: string | null;
  status: Status;
  error?: string;
}

interface MoodUploadSignature {
  apiKey: string;
  folder: string;
  publicId: string;
  timestamp: string;
  signature: string;
  uploadUrl: string;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: string;
  bytes?: number;
  error?: { message?: string };
}

function MoodCard({
  mood,
  state,
  onFile,
  onDelete,
}: {
  mood: typeof MOODS[number];
  state: MoodState;
  onFile: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = mood.icon;
  const displaySrc = state.preview ?? state.src;

  return (
    <div className="flex flex-col gap-2">
      {/* Card */}
      <div
        className="relative h-44 sm:h-48 rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-200 cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {/* Background image */}
        {displaySrc && (
          <img
            src={displaySrc}
            alt={mood.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${mood.tint} transition-opacity duration-300 ${displaySrc ? "opacity-60" : "opacity-100"}`} />

        {/* Hover upload overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
          {state.status === "uploading" ? (
            <Loader2 size={28} className="text-white animate-spin" />
          ) : state.status === "done" ? (
            <Check size={28} className="text-emerald-400" />
          ) : (
            <Upload size={28} className="text-white" />
          )}
          <p className="text-white text-xs mt-2 font-medium">
            {displaySrc ? "Change image" : "Add image"}
          </p>
        </div>

        {/* Always-visible status badge */}
        {state.status === "uploading" && (
          <div className="absolute top-3 left-3 bg-black/60 rounded-full p-1.5">
            <Loader2 size={14} className="text-white animate-spin" />
          </div>
        )}
        {state.status === "done" && (
          <div className="absolute top-3 left-3 bg-emerald-500/80 rounded-full p-1.5">
            <Check size={14} className="text-white" />
          </div>
        )}

        {/* Delete button */}
        {displaySrc && state.status === "idle" && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-rose-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        )}

        {/* Bottom label */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center gap-2">
          <Icon size={15} className="text-white/80" strokeWidth={1.8} />
          <span className="text-white text-[14px] font-semibold drop-shadow">{mood.label}</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Error */}
      {state.status === "error" && (
        <p className="text-rose-400 text-xs px-1">{state.error}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [moodStates, setMoodStates] = useState<Record<string, MoodState>>(
    Object.fromEntries(MOODS.map((m) => [m.id, { src: null, preview: null, status: "idle" }]))
  );

  // Load existing images from DB on mount
  useEffect(() => {
    fetch("/api/moods/images")
      .then((r) => r.json())
      .then((images: Record<string, string>) => {
        setMoodStates((prev) => {
          const next = { ...prev };
          for (const [id, src] of Object.entries(images)) {
            if (next[id]) next[id] = { ...next[id], src };
          }
          return next;
        });
      });
  }, []);

  const setStatus = (id: string, patch: Partial<MoodState>) =>
    setMoodStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleFile = async (moodId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setStatus(moodId, { preview, status: "uploading", error: undefined });

    try {
      const signRes = await fetch(`/api/moods/${moodId}/image-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const signed = await signRes.json() as MoodUploadSignature & { error?: string };
      if (!signRes.ok) throw new Error(signed.error ?? "Upload failed");

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("api_key", signed.apiKey);
      uploadData.append("timestamp", signed.timestamp);
      uploadData.append("folder", signed.folder);
      uploadData.append("public_id", signed.publicId);
      uploadData.append("signature", signed.signature);

      const cloudRes = await fetch(signed.uploadUrl, { method: "POST", body: uploadData });
      const cloud = await cloudRes.json() as CloudinaryUploadResult;
      if (!cloudRes.ok || !cloud.secure_url || !cloud.public_id) {
        throw new Error(cloud.error?.message ?? "Cloudinary upload failed");
      }

      const res = await fetch(`/api/moods/${moodId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: cloud.public_id,
          url: cloud.secure_url,
          resourceType: cloud.resource_type,
          mimeType: file.type || (cloud.resource_type === "video" ? "video/mp4" : "image/jpeg"),
          size: cloud.bytes || file.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setStatus(moodId, { src: data.src, preview, status: "done" });
      setTimeout(() => setStatus(moodId, { status: "idle" }), 2000);
    } catch (err) {
      setStatus(moodId, { status: "error", error: (err as Error).message, preview: null });
    }
  };

  const handleDelete = async (moodId: string) => {
    await fetch(`/api/moods/${moodId}/image`, { method: "DELETE" });
    setStatus(moodId, { src: null, preview: null, status: "idle" });
  };

  return (
    <div className="min-h-screen bg-[#0a0805] text-white">
      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <Settings size={18} className="text-white/60" />
              <h1 className="text-xl font-bold">Settings</h1>
            </div>
            <p className="text-white/40 text-sm mt-0.5">Customize the interface</p>
          </div>
        </div>

        {/* Mood images section */}
        <section>
          <div className="mb-5">
            <h2 className="text-[15px] font-semibold text-white/90">Mood Backgrounds</h2>
            <p className="text-white/40 text-sm mt-1">
              Click each mood to upload an image. It will appear as the background for that mood.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {MOODS.map((mood) => (
              <MoodCard
                key={mood.id}
                mood={mood}
                state={moodStates[mood.id]}
                onFile={(file) => handleFile(mood.id, file)}
                onDelete={() => handleDelete(mood.id)}
              />
            ))}
          </div>

          <p className="text-white/25 text-xs mt-4">
            Supports JPG, PNG, WebP, and GIF. Max 10MB per image.
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-white/8 my-8" />

        {/* Quick links */}
        <section>
          <h2 className="text-[15px] font-semibold text-white/90 mb-4">Quick Links</h2>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/25 hover:bg-white/5 transition-all"
            >
              Upload music
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
