"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Music, Trash2, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { DEFAULT_MOODS, type MoodDef } from "@/lib/moods";

interface Song {
  id: number;
  title: string;
  artist: string;
  duration: string;
  src: string;
}

interface UploadItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  duration: string;
  mood: string;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
  result?: Song;
}

interface SongUploadSignature {
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
  error?: { message?: string };
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function readAudioDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(formatDuration(audio.duration || 0));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("0:00");
    };
  });
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [moods, setMoods] = useState<MoodDef[]>(DEFAULT_MOODS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/moods")
      .then((r) => r.json())
      .then((list: MoodDef[]) => setMoods(list))
      .catch(() => {});
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac)$/i.test(f.name)
    );

    const newItems: UploadItem[] = await Promise.all(
      audioFiles.map(async (file) => {
        const duration = await readAudioDuration(file);
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        return {
          id: crypto.randomUUID(),
          file,
          title: nameWithoutExt,
          artist: "",
          duration,
          mood: "",
          status: "idle" as const,
        };
      })
    );

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const uploadItem = async (item: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
    );

    try {
      const signRes = await fetch("/api/songs/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: item.file.name,
          fileType: item.file.type,
          fileSize: item.file.size,
        }),
      });
      const signed = await signRes.json() as SongUploadSignature & { error?: string };
      if (!signRes.ok) throw new Error(signed.error || "Upload failed");

      const uploadData = new FormData();
      uploadData.append("file", item.file);
      uploadData.append("api_key", signed.apiKey);
      uploadData.append("timestamp", signed.timestamp);
      uploadData.append("folder", signed.folder);
      uploadData.append("public_id", signed.publicId);
      uploadData.append("signature", signed.signature);

      const cloudRes = await fetch(signed.uploadUrl, { method: "POST", body: uploadData });
      const cloud = await cloudRes.json() as CloudinaryUploadResult;
      if (!cloudRes.ok || !cloud.secure_url || !cloud.public_id) {
        throw new Error(cloud.error?.message || "Cloudinary upload failed");
      }

      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          mood: item.mood || null,
          src: cloud.secure_url,
          cloudinaryPublicId: cloud.public_id,
          cloudinaryResourceType: cloud.resource_type || "video",
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", result: data } : i
        )
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", error: (err as Error).message }
            : i
        )
      );
    }
  };

  const uploadAll = () => {
    items.filter((i) => i.status === "idle" && i.title && i.artist).forEach(uploadItem);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const pendingCount = items.filter((i) => i.status === "idle").length;
  const allFilled = items.filter((i) => i.status === "idle").every((i) => i.title && i.artist);

  return (
    <div className="min-h-screen bg-[#0a0805] text-white p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Upload Music</h1>
            <p className="text-white/45 text-sm mt-1">Add songs to the library</p>
          </div>
          <Link
            href="/"
            className="text-white/50 hover:text-white/80 text-sm transition-colors border border-white/10 rounded-full px-4 py-1.5 hover:border-white/25"
          >
            ← Back
          </Link>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-6 ${
            dragging
              ? "border-teal-400/60 bg-teal-500/10"
              : "border-white/15 hover:border-white/30 hover:bg-white/3"
          }`}
        >
          <Upload size={36} className="mx-auto mb-3 text-white/35" />
          <p className="text-white/70 font-medium">Drag audio files here</p>
          <p className="text-white/35 text-sm mt-1">or click to choose files</p>
          <p className="text-white/25 text-xs mt-3">MP3 · WAV · OGG · FLAC · AAC · Max 50MB/file</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Song list */}
        {items.length > 0 && (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/8 rounded-2xl p-4 flex gap-4 items-start"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.status === "uploading" && <Loader2 size={18} className="text-teal-400 animate-spin" />}
                    {item.status === "done" && <Check size={18} className="text-emerald-400" />}
                    {item.status === "error" && <X size={18} className="text-rose-400" />}
                    {item.status === "idle" && <Music size={18} className="text-white/40" />}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-2 gap-2.5">
                    <input
                      placeholder="Song title *"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      disabled={item.status !== "idle"}
                      className="col-span-2 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                    />
                    <input
                      placeholder="Artist *"
                      value={item.artist}
                      onChange={(e) => updateItem(item.id, { artist: e.target.value })}
                      disabled={item.status !== "idle"}
                      className="bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                    />
                    <input
                      placeholder="Duration (e.g. 3:45)"
                      value={item.duration}
                      onChange={(e) => updateItem(item.id, { duration: e.target.value })}
                      disabled={item.status !== "idle"}
                      className="bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                    />
                    <select
                      value={item.mood}
                      onChange={(e) => updateItem(item.id, { mood: e.target.value })}
                      disabled={item.status !== "idle"}
                      className="col-span-2 bg-[#1a1410] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 disabled:opacity-50"
                    >
                      <option value="" className="bg-[#1a1410] text-white/50">— Mood (optional) —</option>
                      {moods.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#1a1410] text-white">
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {item.status === "error" && (
                      <p className="col-span-2 text-rose-400 text-xs mt-0.5">{item.error}</p>
                    )}
                    {item.status === "done" && (
                      <p className="col-span-2 text-emerald-400 text-xs mt-0.5">
                        Upload successful · ID #{item.result?.id}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {item.status === "idle" && (
                      <button
                        onClick={() => uploadItem(item)}
                        disabled={!item.title || !item.artist}
                        className="text-xs bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Upload
                      </button>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-white/25 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload all button */}
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                disabled={!allFilled}
                className="w-full py-3 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-300 font-medium hover:bg-teal-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {allFilled
                  ? `Upload all (${pendingCount} songs)`
                  : "Fill in song title and artist to upload"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
