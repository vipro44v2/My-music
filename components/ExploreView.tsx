"use client";

import { useState, useEffect, useRef } from "react";
import {
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles,
  Search, Play, Plus, Check, Loader2, ListMusic, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { Song } from "@/lib/songs";
import type { MoodDef } from "@/lib/moods";
import type { UserInfo } from "./TopBar";
import MoodMedia from "./MoodMedia";

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles,
};

const thumbGradients = [
  "from-sky-500 to-teal-600",
  "from-emerald-500 to-green-700",
  "from-blue-500 to-indigo-700",
  "from-cyan-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-700",
  "from-lime-500 to-green-600",
];

const playlistGradients = [
  "from-teal-600 to-cyan-800",
  "from-violet-600 to-purple-800",
  "from-rose-600 to-pink-800",
  "from-amber-600 to-orange-800",
  "from-emerald-600 to-green-800",
  "from-blue-600 to-indigo-800",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaylistEntry {
  playlistId: string;
  songId: number;
  song?: Song;
}

interface Playlist {
  id: string;
  name: string;
  songs: PlaylistEntry[];
}

// ─── Sound wave ───────────────────────────────────────────────────────────────

function SoundWave() {
  return (
    <div className="flex items-end gap-[2px] h-3.5 w-4 flex-shrink-0">
      <div className="w-[3px] bg-teal-400 rounded-full sound-bar-1" style={{ height: "5px" }} />
      <div className="w-[3px] bg-teal-400 rounded-full sound-bar-2" style={{ height: "10px" }} />
      <div className="w-[3px] bg-teal-400 rounded-full sound-bar-3" style={{ height: "7px" }} />
    </div>
  );
}

// ─── Add-to-playlist popover ──────────────────────────────────────────────────

function PlaylistPopover({
  songId, playlists, onAdd, onCreate, onClose,
}: {
  songId: number;
  playlists: Playlist[];
  onAdd: (playlistId: string) => Promise<void>;
  onCreate: (name: string) => Promise<Playlist | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleAdd = async (id: string) => {
    setAdding(id);
    await onAdd(id);
    setAdding(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const pl = await onCreate(newName.trim());
    setCreating(false);
    if (pl) { await onAdd(pl.id); onClose(); }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 bottom-full mb-1.5 z-50 w-52 rounded-xl border border-white/10 py-1.5 shadow-2xl shadow-black/70"
      style={{ background: "rgba(12,9,7,0.97)", backdropFilter: "blur(24px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-3 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
        Add to playlist
      </p>
      {playlists.length === 0 ? (
        <p className="px-3 py-1.5 text-white/30 text-xs">No playlists yet</p>
      ) : (
        <div className="max-h-32 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {playlists.map((pl) => {
            const already = pl.songs.some((s) => s.songId === songId);
            return (
              <button
                key={pl.id}
                onClick={() => !already && handleAdd(pl.id)}
                disabled={already || adding === pl.id}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  already ? "text-teal-400/60 cursor-default" : "text-white/70 hover:text-white hover:bg-white/6"
                }`}
              >
                {adding === pl.id ? <Loader2 size={10} className="animate-spin flex-shrink-0" />
                  : already ? <Check size={10} className="text-teal-400 flex-shrink-0" />
                  : <ListMusic size={10} className="text-white/25 flex-shrink-0" />}
                <span className="truncate">{pl.name}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="border-t border-white/8 mx-2 my-1" />
      <div className="px-2 pb-1 flex gap-1.5">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New playlist name..."
          className="flex-1 min-w-0 bg-white/6 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="w-7 h-7 flex items-center justify-center bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-lg hover:bg-teal-500/25 disabled:opacity-30 flex-shrink-0"
        >
          {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        </button>
      </div>
    </div>
  );
}

// ─── Song row (numbered) ──────────────────────────────────────────────────────

function SongRow({
  song, index, isActive, isPlaying, isFav,
  onSelect, onToggleFavorite,
  playlists, onAddToPlaylist, onCreatePlaylist, showPlaylistBtn,
}: {
  song: Song; index: number; isActive: boolean; isPlaying: boolean; isFav: boolean;
  onSelect: () => void; onToggleFavorite: () => void;
  playlists: Playlist[];
  onAddToPlaylist: (id: string) => Promise<void>;
  onCreatePlaylist: (name: string) => Promise<Playlist | null>;
  showPlaylistBtn: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const gradient = thumbGradients[index % thumbGradients.length];

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive ? "bg-white/10" : "hover:bg-white/6"
      }`}
    >
      {/* Number / playing indicator */}
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        {isActive && isPlaying ? (
          <SoundWave />
        ) : (
          <span className={`text-xs tabular-nums font-medium ${isActive ? "text-teal-400" : "text-white/25 group-hover:text-white/40"}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex-shrink-0 shadow`} />

      {/* Title / artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${isActive ? "text-white" : "text-white/80 group-hover:text-white"}`}>
          {song.title}
        </p>
        <p className="text-white/40 text-xs truncate mt-0.5">{song.artist}</p>
      </div>

      {/* Duration + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs tabular-nums ${isActive ? "text-white/40" : "text-white/25 group-hover:text-white/35"}`}>
          {song.duration}
        </span>

        {showPlaylistBtn && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              className="opacity-0 group-hover:opacity-100 text-white/35 hover:text-teal-400 transition-all p-0.5"
            >
              <Plus size={13} />
            </button>
            {showMenu && (
              <PlaylistPopover
                songId={song.id}
                playlists={playlists}
                onAdd={onAddToPlaylist}
                onCreate={onCreatePlaylist}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`transition-all duration-150 ${
            isFav ? "text-rose-400" : "opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400"
          }`}
        >
          <Heart size={13} className={isFav ? "fill-rose-400" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  songs: Song[];
  moods: MoodDef[];
  customImages: Record<string, string>;
  currentSongId: number;
  isPlaying: boolean;
  onSelect: (id: number) => void;
  favorites: Set<number>;
  onToggleFavorite: (id: number) => void;
  user?: UserInfo | null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExploreView({
  songs, moods, customImages,
  currentSongId, isPlaying, onSelect, favorites, onToggleFavorite, user,
}: Props) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!user) { setPlaylists([]); return; }
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((data: Playlist[]) => setPlaylists(data))
      .catch(() => {});
  }, [user?.id]);

  const handleAddToPlaylist = async (playlistId: string, songId: number) => {
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    if (res.ok) {
      setPlaylists((prev) => prev.map((p) =>
        p.id === playlistId && !p.songs.some((s) => s.songId === songId)
          ? { ...p, songs: [...p.songs, { playlistId, songId }] }
          : p
      ));
    }
  };

  const handleCreatePlaylist = async (name: string): Promise<Playlist | null> => {
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const pl = await res.json() as Playlist;
    const newPl: Playlist = { ...pl, songs: [] };
    setPlaylists((prev) => [newPl, ...prev]);
    return newPl;
  };

  const moodCounts = songs.reduce((acc, s) => {
    if (s.mood) acc[s.mood] = (acc[s.mood] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute displayed songs from all filters
  const displayedSongs = songs.filter((s) => {
    if (selectedMood && s.mood !== selectedMood) return false;
    if (selectedPlaylist) {
      const pl = playlists.find((p) => p.id === selectedPlaylist);
      if (pl && !pl.songs.some((ps) => ps.songId === s.id)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.artist.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeFilterLabel =
    selectedPlaylist ? playlists.find((p) => p.id === selectedPlaylist)?.name
    : selectedMood ? moods.find((m) => m.id === selectedMood)?.label
    : null;

  const clearFilters = () => { setSelectedMood(null); setSelectedPlaylist(null); };

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Explore</p>
        <h1 className="text-3xl font-bold text-white leading-tight mb-1">
          Explore Music
        </h1>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: "#2dd4bf" }}>
          By Mood
        </h1>
        <p className="text-white/45 text-sm mb-5 leading-relaxed">
          Discover songs for every moment.<br />
          Choose a mood and start listening.
        </p>
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs, artists..."
            className="w-full bg-white/8 border border-white/12 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:bg-white/10 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Browse Categories ─────────────────────────────────────────────── */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-base">Browse Categories</h2>
          {selectedMood && (
            <button
              onClick={() => setSelectedMood(null)}
              className="text-teal-400/80 hover:text-teal-300 text-xs transition-colors"
            >
              View all →
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {moods.map((mood) => {
            const Icon = ICON_MAP[mood.icon] ?? Cloud;
            const count = moodCounts[mood.id] ?? 0;
            const isSelected = selectedMood === mood.id;
            const imgSrc = customImages[mood.id] ?? mood.fallback ?? null;

            return (
              <button
                key={mood.id}
                onClick={() => { setSelectedMood(isSelected ? null : mood.id); setSelectedPlaylist(null); }}
                className={`relative overflow-hidden rounded-2xl text-left transition-all duration-200 ${
                  isSelected ? "ring-2 ring-teal-400/60 ring-offset-1 ring-offset-transparent" : "hover:scale-[1.02]"
                }`}
                style={{ aspectRatio: "16/9" }}
              >
                {/* Background image */}
                {imgSrc ? (
                  <MoodMedia src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${mood.overlay}`} />
                )}

                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.overlay} ${imgSrc ? "opacity-60" : "opacity-80"}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                  <Icon size={20} className="text-white/90" strokeWidth={1.8} />
                  <div>
                    <p className="text-white font-semibold text-sm leading-tight">{mood.label}</p>
                    <p className="text-white/55 text-[11px] mt-0.5">{count} songs</p>
                  </div>
                </div>

                {/* Selected dot */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-400 shadow shadow-teal-400/60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Featured Playlists ────────────────────────────────────────────── */}
      {user ? (
        playlists.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between px-6 mb-4">
              <h2 className="text-white font-semibold text-base">Playlists</h2>
              <span className="text-white/30 text-xs">{playlists.length} playlists</span>
            </div>
            <div
              className="flex gap-3 px-6 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {playlists.map((pl, i) => {
                const isSelected = selectedPlaylist === pl.id;
                const gradient = playlistGradients[i % playlistGradients.length];
                return (
                  <button
                    key={pl.id}
                    onClick={() => { setSelectedPlaylist(isSelected ? null : pl.id); setSelectedMood(null); }}
                    className={`relative flex-shrink-0 w-36 rounded-2xl overflow-hidden text-left transition-all duration-200 group ${
                      isSelected ? "ring-2 ring-teal-400/60 ring-offset-1 ring-offset-transparent" : "hover:scale-[1.03]"
                    }`}
                    style={{ aspectRatio: "1" }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play size={16} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <p className="text-white font-semibold text-sm truncate leading-tight">{pl.name}</p>
                      <p className="text-white/55 text-[11px] mt-0.5">{pl.songs.length} songs</p>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null
      ) : (
        <div className="mx-6 mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/4 border border-white/8">
          <ListMusic size={16} className="text-white/25 flex-shrink-0" />
          <p className="text-white/35 text-sm flex-1">
            <Link href="/auth" className="text-teal-400/80 hover:text-teal-300 transition-colors font-medium">
              Log in
            </Link>{" "}
            to view and add songs to playlists
          </p>
        </div>
      )}

      {/* ── Song list ─────────────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold text-base">
              {search ? "Search results" : "Songs"}
            </h2>
            {activeFilterLabel && (
              <span className="flex items-center gap-1 bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-full text-[11px] px-2.5 py-0.5">
                {activeFilterLabel}
                <button onClick={clearFilters} className="text-teal-400/60 hover:text-teal-300 ml-0.5">
                  <X size={10} />
                </button>
              </span>
            )}
            <span className="text-white/25 text-xs">{displayedSongs.length}</span>
          </div>
        </div>

        {displayedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <Music size={22} className="text-white/20" />
            </div>
            <p className="text-white/25 text-sm text-center leading-relaxed">
              {search ? `No results for "${search}"` : "No songs in this mood yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayedSongs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                isActive={song.id === currentSongId}
                isPlaying={isPlaying}
                isFav={favorites.has(song.id)}
                onSelect={() => onSelect(song.id)}
                onToggleFavorite={() => onToggleFavorite(song.id)}
                playlists={playlists}
                onAddToPlaylist={(plId) => handleAddToPlaylist(plId, song.id)}
                onCreatePlaylist={handleCreatePlaylist}
                showPlaylistBtn={!!user}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
