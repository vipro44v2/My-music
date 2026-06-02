"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PointerEvent } from "react";
import {
  Music, ImageIcon, Trash2, Upload, Loader2, Check, X,
  LogOut, Shield, Music2, Plus, ChevronDown, Pencil,
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles, type LucideIcon,
  MessageSquare, Send, ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type MoodDef, ICON_OPTIONS, OVERLAY_OPTIONS } from "@/lib/moods";
import MoodMedia, { isVideoSrc } from "@/components/MoodMedia";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles,
};

interface Song {
  id: number;
  title: string;
  artist: string;
  duration: string;
  src: string;
  mood?: string | null;
}

interface UploadItem {
  uid: string;
  file: File;
  title: string;
  artist: string;
  duration: string;
  mood: string;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
}

interface SongUploadSignature {
  apiKey: string;
  folder: string;
  publicId: string;
  timestamp: string;
  signature: string;
  uploadUrl: string;
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

type MoodStatus = "idle" | "uploading" | "done" | "error";

interface MoodState {
  src: string | null;
  preview: string | null;
  previewType?: string | null;
  status: MoodStatus;
  error?: string;
}

interface MoodImagePosition {
  desktop: string;
  mobile: string;
}

const POSITION_OPTIONS = [
  { value: "center center", label: "Center" },
  { value: "center top", label: "Top" },
  { value: "center bottom", label: "Bottom" },
  { value: "left center", label: "Left" },
  { value: "right center", label: "Right" },
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function positionToPercent(position: string) {
  const percentMatch = position.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return {
      x: clampPercent(Number(percentMatch[1])),
      y: clampPercent(Number(percentMatch[2])),
    };
  }

  const [horizontal = "center", vertical = "center"] = position.split(" ");
  return {
    x: horizontal === "left" ? 0 : horizontal === "right" ? 100 : 50,
    y: vertical === "top" ? 0 : vertical === "bottom" ? 100 : 50,
  };
}

function percentToPosition(x: number, y: number) {
  return `${clampPercent(x)}% ${clampPercent(y)}%`;
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
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(formatDuration(audio.duration || 0)); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve("0:00"); };
  });
}

function SongsTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingMoodId, setUpdatingMoodId] = useState<number | null>(null);
  const [moods, setMoods] = useState<import("@/lib/moods").MoodDef[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => { setSongs(data); setLoadingSongs(false); })
      .catch(() => setLoadingSongs(false));
    fetch("/api/moods")
      .then((r) => r.json())
      .then((list: import("@/lib/moods").MoodDef[]) => setMoods(list))
      .catch(() => {});
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac)$/i.test(f.name)
    );
    const newItems: UploadItem[] = await Promise.all(
      audioFiles.map(async (file) => ({
        uid: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        artist: "",
        duration: await readAudioDuration(file),
        mood: "",
        status: "idle" as const,
      }))
    );
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const updateItem = (uid: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));

  const removeItem = (uid: string) => setItems((prev) => prev.filter((i) => i.uid !== uid));

  const uploadItem = async (item: UploadItem) => {
    updateItem(item.uid, { status: "uploading" });
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
      if (!signRes.ok) throw new Error(signed.error ?? "Upload failed");

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
        throw new Error(cloud.error?.message ?? "Cloudinary upload failed");
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
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      updateItem(item.uid, { status: "done" });
      setSongs((prev) => [...prev, data]);
      setTimeout(() => removeItem(item.uid), 1500);
    } catch (err) {
      updateItem(item.uid, { status: "error", error: (err as Error).message });
    }
  };

  const deleteSong = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/songs/${id}`, { method: "DELETE" });
      setSongs((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const updateSongMood = async (id: number, mood: string) => {
    setUpdatingMoodId(id);
    try {
      const res = await fetch(`/api/songs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: mood || null }),
      });
      if (res.ok) {
        setSongs((prev) => prev.map((s) => s.id === id ? { ...s, mood: mood || null } : s));
      }
    } finally {
      setUpdatingMoodId(null);
    }
  };

  const pendingItems = items.filter((i) => i.status === "idle");
  const allFilled = pendingItems.every((i) => i.title && i.artist);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-4">
          Library ({songs.length} songs)
        </h2>
        {loadingSongs ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : songs.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-8">No songs yet.</p>
        ) : (
          <div className="space-y-1.5">
            {songs.map((song, idx) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/6 hover:bg-white/6 group transition-colors"
              >
                <span className="text-white/25 text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>
                <Music2 size={14} className="text-white/30 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{song.title}</p>
                  <p className="text-white/45 text-xs truncate">{song.artist}</p>
                </div>
                <span className="text-white/30 text-xs flex-shrink-0">{song.duration}</span>
                {/* Mood selector */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {updatingMoodId === song.id && (
                    <Loader2 size={12} className="text-white/30 animate-spin" />
                  )}
                  <select
                    value={song.mood ?? ""}
                    onChange={(e) => updateSongMood(song.id, e.target.value)}
                    disabled={updatingMoodId === song.id}
                    className="bg-white/6 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-white/25 transition-colors disabled:opacity-50 max-w-[110px]"
                  >
                    <option value="" className="bg-[#1c1712] text-white/50">Mood...</option>
                    {moods.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1c1712] text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => deleteSong(song.id)}
                  disabled={deletingId === song.id}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400 transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {deletingId === song.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-4">
          Add Songs
        </h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragging ? "border-teal-400/60 bg-teal-500/8" : "border-white/10 hover:border-white/20 hover:bg-white/3"
          }`}
        >
          <Upload size={28} className="mx-auto mb-3 text-white/25" />
          <p className="text-white/55 text-sm font-medium">Drag & drop or click to select</p>
          <p className="text-white/25 text-xs mt-1.5">MP3 · WAV · OGG · FLAC · AAC · Max 50MB/file</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {items.map((item) => (
              <div key={item.uid} className="bg-white/4 border border-white/8 rounded-2xl p-4 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.status === "uploading" && <Loader2 size={16} className="text-teal-400 animate-spin" />}
                  {item.status === "done"      && <Check   size={16} className="text-emerald-400" />}
                  {item.status === "error"     && <X       size={16} className="text-rose-400" />}
                  {item.status === "idle"      && <Music   size={16} className="text-white/35" />}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    placeholder="Song title *"
                    value={item.title}
                    onChange={(e) => updateItem(item.uid, { title: e.target.value })}
                    disabled={item.status !== "idle"}
                    className="col-span-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                  />
                  <input
                    placeholder="Artist *"
                    value={item.artist}
                    onChange={(e) => updateItem(item.uid, { artist: e.target.value })}
                    disabled={item.status !== "idle"}
                    className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                  />
                  <input
                    placeholder="Duration"
                    value={item.duration}
                    onChange={(e) => updateItem(item.uid, { duration: e.target.value })}
                    disabled={item.status !== "idle"}
                    className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 disabled:opacity-50"
                  />
                  <select
                    value={item.mood}
                    onChange={(e) => updateItem(item.uid, { mood: e.target.value })}
                    disabled={item.status !== "idle"}
                    className="bg-[#1c1712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 disabled:opacity-50"
                  >
                    <option value="" className="bg-[#1c1712] text-white/50">— Category —</option>
                    {moods.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1c1712] text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {item.status === "error" && (
                    <p className="col-span-2 text-rose-400 text-xs">{item.error}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {item.status === "idle" && (
                    <button
                      onClick={() => uploadItem(item)}
                      disabled={!item.title || !item.artist}
                      className="text-xs bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Upload
                    </button>
                  )}
                  <button onClick={() => removeItem(item.uid)} className="text-white/20 hover:text-rose-400 transition-colors self-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {pendingItems.length > 1 && (
              <button
                onClick={() => pendingItems.forEach(uploadItem)}
                disabled={!allFilled}
                className="w-full py-2.5 rounded-xl bg-teal-500/15 border border-teal-500/25 text-teal-300 text-sm font-medium hover:bg-teal-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {allFilled ? `Upload all (${pendingItems.length} songs)` : "Fill in title and artist for all"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function MoodsTab() {
  const [moods, setMoods] = useState<MoodDef[]>([]);
  const [moodStates, setMoodStates] = useState<Record<string, MoodState>>({});
  const [imagePositions, setImagePositions] = useState<Record<string, MoodImagePosition>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingMood, setDeletingMood] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    id: "", label: "", desc: "",
    icon: ICON_OPTIONS[0] as string,
    overlay: OVERLAY_OPTIONS[0].value as string,
  });
  const [createStatus, setCreateStatus] = useState<"idle" | "saving" | "error">("idle");
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingMood, setEditingMood] = useState<MoodDef | null>(null);
  const [editForm, setEditForm] = useState({ label: "", desc: "", icon: ICON_OPTIONS[0] as string, overlay: OVERLAY_OPTIONS[0].value as string });
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    fetch("/api/moods")
      .then((r) => r.json())
      .then((list: MoodDef[]) => {
        setMoods(list);
        setMoodStates(Object.fromEntries(list.map((m) => [m.id, { src: null, preview: null, status: "idle" }])));
      })
      .catch(() => {});
    fetch("/api/moods/images")
      .then((r) => r.json())
      .then((images: Record<string, string>) => {
        setMoodStates((prev) => {
          const next = { ...prev };
          for (const [id, src] of Object.entries(images)) {
            if (next[id]) next[id] = { ...next[id], src };
            else next[id] = { src, preview: null, status: "idle" };
          }
          return next;
        });
      })
      .catch(() => {});
    fetch("/api/moods/positions")
      .then((r) => r.json())
      .then((positions: Record<string, MoodImagePosition>) => setImagePositions(positions))
      .catch(() => {});
  }, []);

  const setStatus = (id: string, patch: Partial<MoodState>) =>
    setMoodStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { src: null, preview: null, status: "idle" }), ...patch } }));

  const handleFile = async (moodId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setStatus(moodId, { preview, previewType: file.type, status: "uploading", error: undefined });
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
      setStatus(moodId, { src: data.src, preview, previewType: file.type, status: "done" });
      setTimeout(() => setStatus(moodId, { status: "idle" }), 2000);
    } catch (err) {
      setStatus(moodId, { status: "error", error: (err as Error).message, preview: null, previewType: null });
    }
  };

  const handleDeleteImage = async (moodId: string) => {
    await fetch(`/api/moods/${moodId}/image`, { method: "DELETE" });
    setStatus(moodId, { src: null, preview: null, previewType: null, status: "idle" });
  };

  const handleDeleteMood = async (moodId: string) => {
    setDeletingMood(moodId);
    try {
      await fetch(`/api/moods/${moodId}`, { method: "DELETE" });
      setMoods((prev) => prev.filter((m) => m.id !== moodId));
      setMoodStates((prev) => { const next = { ...prev }; delete next[moodId]; return next; });
    } finally {
      setDeletingMood(null);
    }
  };

  const updateImagePosition = async (moodId: string, patch: Partial<MoodImagePosition>) => {
    const current = imagePositions[moodId] ?? { desktop: "center center", mobile: "center center" };
    const next = { ...current, ...patch };
    setImagePositions((prev) => ({ ...prev, [moodId]: next }));
    await fetch("/api/moods/positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: moodId, ...next }),
    }).catch(() => {});
  };

  const startEdit = (mood: MoodDef) => {
    setEditingMood(mood);
    setEditForm({ label: mood.label, desc: mood.desc, icon: mood.icon, overlay: mood.overlay });
    setEditStatus("idle");
    setEditError("");
    setShowCreateForm(false);
  };

  const cancelEdit = () => { setEditingMood(null); setEditError(""); setEditStatus("idle"); };

  const handleUpdate = async () => {
    if (!editingMood) return;
    setEditStatus("saving");
    setEditError("");
    try {
      const res = await fetch(`/api/moods/${editingMood.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json() as MoodDef & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMoods((prev) => prev.map((m) => m.id === editingMood.id ? { ...m, ...editForm } : m));
      setEditingMood(null);
      setEditStatus("idle");
    } catch (err) {
      setEditError((err as Error).message);
      setEditStatus("error");
    }
  };

  const handleCreate = async () => {
    setCreateStatus("saving");
    setCreateError("");
    try {
      const res = await fetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json() as MoodDef & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setMoods((prev) => [...prev, data]);
      setMoodStates((prev) => ({ ...prev, [data.id]: { src: null, preview: null, status: "idle" } }));
      setCreateForm({ id: "", label: "", desc: "", icon: ICON_OPTIONS[0], overlay: OVERLAY_OPTIONS[0].value });
      setShowCreateForm(false);
      setCreateStatus("idle");
    } catch (err) {
      setCreateError((err as Error).message);
      setCreateStatus("error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/40 text-sm">
          Click a mood to upload its background. Supports JPG, PNG, WebP, GIF, MP4 video without sound · Max 50MB.
        </p>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-xl px-3 py-1.5 hover:bg-teal-500/25 transition-all flex-shrink-0"
        >
          {showCreateForm ? <ChevronDown size={14} /> : <Plus size={14} />}
          New Mood
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 bg-white/4 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white text-sm font-semibold">Create New Mood</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">ID (slug) *</label>
              <input
                placeholder="e.g. jazz, focus"
                value={createForm.id}
                onChange={(e) => setCreateForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Label *</label>
              <input
                placeholder="e.g. Jazz, Focus"
                value={createForm.label}
                onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Description</label>
              <input
                placeholder="Short description"
                value={createForm.desc}
                onChange={(e) => setCreateForm((f) => ({ ...f, desc: e.target.value }))}
                className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Icon</label>
              <select
                value={createForm.icon}
                onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))}
                className="bg-[#1c1712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              >
                {ICON_OPTIONS.map((name) => (
                  <option key={name} value={name} className="bg-[#1c1712] text-white">{name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Color Theme</label>
              <select
                value={createForm.overlay}
                onChange={(e) => setCreateForm((f) => ({ ...f, overlay: e.target.value }))}
                className="bg-[#1c1712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              >
                {OVERLAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1c1712] text-white">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {createError && <p className="text-rose-400 text-xs">{createError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowCreateForm(false); setCreateError(""); setCreateStatus("idle"); }}
              className="text-white/40 hover:text-white/70 text-sm px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!createForm.id || !createForm.label || createStatus === "saving"}
              className="flex items-center gap-1.5 text-sm bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-xl px-4 py-1.5 hover:bg-teal-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {createStatus === "saving" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {moods.map((mood) => (
          <AdminMoodCard
            key={mood.id}
            mood={mood}
            state={moodStates[mood.id] ?? { src: null, preview: null, status: "idle" }}
            isEditing={editingMood?.id === mood.id}
            onFile={(file) => handleFile(mood.id, file)}
            onDeleteImage={() => handleDeleteImage(mood.id)}
            onDeleteMood={() => handleDeleteMood(mood.id)}
            onEdit={() => startEdit(mood)}
            deleting={deletingMood === mood.id}
            position={imagePositions[mood.id] ?? { desktop: "center center", mobile: "center center" }}
            onPositionChange={(patch) => updateImagePosition(mood.id, patch)}
          />
        ))}
      </div>

      {/* Edit panel */}
      {editingMood && (
        <div className="mt-4 bg-white/4 border border-teal-500/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-white text-sm font-semibold">Edit &ldquo;{editingMood.label}&rdquo;</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Label *</label>
              <input
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Description</label>
              <input
                value={editForm.desc}
                onChange={(e) => setEditForm((f) => ({ ...f, desc: e.target.value }))}
                className="bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Icon</label>
              <select
                value={editForm.icon}
                onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                className="bg-[#1c1712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              >
                {ICON_OPTIONS.map((name) => (
                  <option key={name} value={name} className="bg-[#1c1712] text-white">{name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/40 text-xs">Color Theme</label>
              <select
                value={editForm.overlay}
                onChange={(e) => setEditForm((f) => ({ ...f, overlay: e.target.value }))}
                className="bg-[#1c1712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              >
                {OVERLAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1c1712] text-white">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {editError && <p className="text-rose-400 text-xs">{editError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelEdit}
              className="text-white/40 hover:text-white/70 text-sm px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={!editForm.label || editStatus === "saving"}
              className="flex items-center gap-1.5 text-sm bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-xl px-4 py-1.5 hover:bg-teal-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {editStatus === "saving" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMoodCard({
  mood,
  state,
  isEditing,
  onFile,
  onDeleteImage,
  onDeleteMood,
  onEdit,
  deleting,
  position,
  onPositionChange,
}: {
  mood: MoodDef;
  state: MoodState;
  isEditing: boolean;
  onFile: (f: File) => void;
  onDeleteImage: () => void;
  onDeleteMood: () => void;
  onEdit: () => void;
  deleting: boolean;
  position: MoodImagePosition;
  onPositionChange: (patch: Partial<MoodImagePosition>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = ICON_MAP[mood.icon] ?? Cloud;
  const displaySrc = state.preview ?? state.src;
  const [mobilePosition, setMobilePosition] = useState(position.mobile);
  const mobilePositionRef = useRef(position.mobile);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setMobilePosition(position.mobile);
    mobilePositionRef.current = position.mobile;
  }, [position.mobile]);

  const startMobileDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!displaySrc) return;
    event.preventDefault();
    event.stopPropagation();
    const current = positionToPercent(mobilePosition);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveMobileDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = drag.originX - ((event.clientX - drag.startX) / rect.width) * 100;
    const nextY = drag.originY - ((event.clientY - drag.startY) / rect.height) * 100;
    const nextPosition = percentToPosition(nextX, nextY);
    mobilePositionRef.current = nextPosition;
    setMobilePosition(nextPosition);
  };

  const finishMobileDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    onPositionChange({ mobile: mobilePositionRef.current });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative h-44 rounded-2xl overflow-hidden border cursor-pointer group transition-all duration-200 ${
          isEditing ? "border-teal-400/50 ring-1 ring-teal-400/30" : "border-white/10 hover:border-white/25"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {displaySrc && (
          <MoodMedia
            src={state.preview && state.previewType?.startsWith("video/") && !isVideoSrc(displaySrc) ? `${displaySrc}#media=video` : displaySrc}
            alt={mood.label}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: position.desktop }}
          />
        )}
        <div className={`absolute inset-0 bg-gradient-to-br ${mood.overlay} transition-opacity ${displaySrc ? "opacity-55" : "opacity-100"}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35">
          {state.status === "uploading"
            ? <Loader2 size={24} className="text-white animate-spin" />
            : state.status === "done"
            ? <Check size={24} className="text-emerald-400" />
            : <Upload size={24} className="text-white" />}
          <p className="text-white text-xs mt-2">{displaySrc ? "Change background" : "Add background"}</p>
        </div>
        {state.status === "uploading" && (
          <div className="absolute top-2.5 left-2.5 bg-black/60 rounded-full p-1">
            <Loader2 size={12} className="text-white animate-spin" />
          </div>
        )}
        {state.status === "done" && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-500/80 rounded-full p-1">
            <Check size={12} className="text-white" />
          </div>
        )}
        {displaySrc && state.status === "idle" && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteImage(); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={11} />
          </button>
        )}
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-1.5">
          <Icon size={13} className="text-white/80" strokeWidth={1.8} />
          <span className="text-white text-[13px] font-semibold drop-shadow">{mood.label}</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {state.status === "error" && (
        <p className="text-rose-400 text-xs px-1">{state.error}</p>
      )}
      {displaySrc && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-white/30 text-[10px] px-1">Desktop</span>
            <select
              value={position.desktop}
              onChange={(e) => onPositionChange({ desktop: e.target.value })}
              className="bg-white/6 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-white/25"
            >
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1c1712] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-white/30 text-[10px] px-1">Mobile drag</span>
            <button
              type="button"
              onPointerDown={startMobileDrag}
              onPointerMove={moveMobileDrag}
              onPointerUp={finishMobileDrag}
              onPointerCancel={finishMobileDrag}
              className="relative aspect-[9/16] max-h-28 overflow-hidden rounded-lg border border-white/10 bg-black/40 touch-none cursor-grab active:cursor-grabbing"
              title="Drag image to frame it on mobile"
            >
              <MoodMedia
                src={state.preview && state.previewType?.startsWith("video/") && !isVideoSrc(displaySrc) ? `${displaySrc}#media=video` : displaySrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: mobilePosition }}
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-[9px] text-white/55">
                {mobilePosition}
              </span>
            </button>
          </div>
        </div>
      )}
      {!mood.isDefault && (
        <div className="flex items-center justify-center gap-0.5">
          <button
            onClick={onEdit}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
              isEditing ? "text-teal-400 bg-teal-400/10" : "text-white/30 hover:text-teal-400 hover:bg-white/5"
            }`}
          >
            <Pencil size={11} />
            Edit
          </button>
          <span className="text-white/10 text-xs">|</span>
          <button
            onClick={onDeleteMood}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-rose-400 hover:bg-white/5 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface ChatMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

interface ChatUser {
  id: string;
  name: string | null;
  email: string;
  lastMessage: { content: string; createdAt: string; isAdmin: boolean } | null;
  unreadCount: number;
}

function ChatTab() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(() => {
    fetch("/api/chat/users")
      .then((r) => r.json())
      .then((list: ChatUser[]) => { setUsers(list); setLoadingUsers(false); })
      .catch(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadMessages = useCallback((userId: string) => {
    fetch(`/api/chat?userId=${userId}`)
      .then((r) => r.json())
      .then((msgs: ChatMessage[]) => {
        setMessages(msgs);
        // Clear unread count in local state
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, unreadCount: 0 } : u));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser.id);
    inputRef.current?.focus();
  }, [selectedUser, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SSE for realtime chat updates
  useEffect(() => {
    const es = new EventSource("/api/chat/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; userId: string };
        if (event.type !== "chat") return;
        // If viewing that user's chat, reload messages
        setSelectedUser((sel) => {
          if (sel?.id === event.userId) {
            loadMessages(event.userId);
          } else {
            // Increment unread count for that user in the list
            setUsers((prev) =>
              prev.map((u) =>
                u.id === event.userId ? { ...u, unreadCount: u.unreadCount + 1 } : u
              )
            );
            // If the user isn't in the list yet, reload users
            setUsers((prev) => {
              if (!prev.find((u) => u.id === event.userId)) {
                loadUsers();
              }
              return prev;
            });
          }
          return sel;
        });
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [loadMessages, loadUsers]);

  const sendMessage = async () => {
    if (!selectedUser) return;
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, userId: selectedUser.id }),
      });
      const msg: ChatMessage = await res.json();
      setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
    }
  };

  if (selectedUser) {
    const initial = (selectedUser.name ?? selectedUser.email ?? "?")[0].toUpperCase();
    return (
      <div className="flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setSelectedUser(null); setMessages([]); }}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{selectedUser.name ?? selectedUser.email}</p>
            <p className="text-white/35 text-xs">{selectedUser.email}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white/3 border border-white/6 rounded-2xl p-4 space-y-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-white/20 text-xs text-center pt-8">No messages yet</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                msg.isAdmin
                  ? "bg-teal-500/20 border border-teal-500/25 text-teal-100 rounded-tr-sm"
                  : "bg-white/8 border border-white/8 text-white/85 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 mt-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Reply to ${selectedUser.name ?? selectedUser.email}…`}
            className="flex-1 bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center hover:bg-teal-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-4">
        User Conversations
      </h2>
      {loadingUsers ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : users.length === 0 ? (
        <p className="text-white/25 text-sm text-center py-12">No conversations yet.</p>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => {
            const initial = (u.name ?? u.email ?? "?")[0].toUpperCase();
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/6 hover:bg-white/7 hover:border-white/12 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.name ?? u.email}</p>
                  {u.lastMessage && (
                    <p className="text-white/35 text-xs truncate mt-0.5">
                      {u.lastMessage.isAdmin ? "You: " : ""}{u.lastMessage.content}
                    </p>
                  )}
                </div>
                {u.unreadCount > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {u.unreadCount > 9 ? "9+" : u.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Tab = "songs" | "moods" | "chat";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("songs");
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="h-dvh overflow-y-auto bg-[#0a0805] text-white">
      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
              <Shield size={16} className="text-white/60" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin</h1>
              <p className="text-white/35 text-xs">My Chilling</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors border border-white/8 hover:border-white/18 rounded-xl px-3 py-1.5 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            Sign out
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-white/4 border border-white/8 rounded-xl w-fit mb-8">
          {([
            { id: "songs", label: "Songs",       icon: Music },
            { id: "moods", label: "Backgrounds",  icon: ImageIcon },
            { id: "chat",  label: "Chat",         icon: MessageSquare },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? "bg-white/12 text-white" : "text-white/40 hover:text-white/65"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "songs" && <SongsTab />}
        {tab === "moods" && <MoodsTab />}
        {tab === "chat"  && <ChatTab />}
      </div>
    </div>
  );
}
