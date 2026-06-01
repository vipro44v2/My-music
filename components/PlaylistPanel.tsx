"use client";

import { useState, useEffect, useRef } from "react";
import { X, Heart, Music, Clock, ListMusic, Plus, Trash2, Pencil, Check, ChevronLeft, Loader2, LogIn, Play } from "lucide-react";
import Link from "next/link";
import type { Song } from "@/lib/songs";
import type { UserInfo } from "./TopBar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaylistTab = "all" | "favorites" | "recent" | "playlists";

interface PlaylistSongEntry {
  playlistId: string;
  songId: number;
  addedAt: string;
  song: Song;
}

interface Playlist {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  songs: PlaylistSongEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const TABS: { id: PlaylistTab; label: string; icon: React.ElementType }[] = [
  { id: "all",       label: "All",     icon: Music },
  { id: "favorites", label: "Liked",   icon: Heart },
  { id: "recent",    label: "Recent",  icon: Clock },
  { id: "playlists", label: "Lists",   icon: ListMusic },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  songs: Song[];
  currentSongId: number;
  isPlaying: boolean;
  onSelect: (id: number) => void;
  onSelectFromPlaylist: (id: number, queue: Song[]) => void;
  show: boolean;
  onClose: () => void;
  favorites: Set<number>;
  onToggleFavorite: (id: number) => void;
  recent: number[];
  activeTab: PlaylistTab;
  onTabChange: (tab: PlaylistTab) => void;
  user?: UserInfo | null;
}

// ─── Sound wave animation ─────────────────────────────────────────────────────

function SoundWave() {
  return (
    <div className="flex items-end gap-[2px] h-4 w-5 flex-shrink-0">
      <div className="w-[3px] bg-emerald-400 rounded-full sound-bar-1" style={{ height: "6px" }} />
      <div className="w-[3px] bg-emerald-400 rounded-full sound-bar-2" style={{ height: "12px" }} />
      <div className="w-[3px] bg-emerald-400 rounded-full sound-bar-3" style={{ height: "8px" }} />
    </div>
  );
}

// ─── Add-to-playlist popover ──────────────────────────────────────────────────

function AddToPlaylistMenu({
  songId,
  playlists,
  onAdd,
  onClose,
}: {
  songId: number;
  playlists: Playlist[];
  onAdd: (playlistId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-8 top-0 z-50 w-44 rounded-xl border border-white/10 py-1 shadow-2xl shadow-black/60"
      style={{ background: "rgba(14,11,8,0.96)", backdropFilter: "blur(16px)" }}
    >
      {playlists.length === 0 ? (
        <p className="px-3 py-2 text-white/35 text-xs">No playlists yet</p>
      ) : (
        playlists.map((pl) => {
          const already = pl.songs.some((s) => s.songId === songId);
          return (
            <button
              key={pl.id}
              onClick={() => { if (!already) onAdd(pl.id); }}
              disabled={already}
              className={`w-full text-left px-3 py-2 text-xs transition-colors truncate ${
                already
                  ? "text-teal-400/60 cursor-default"
                  : "text-white/70 hover:text-white hover:bg-white/6"
              }`}
            >
              {already ? "✓ " : ""}{pl.name}
            </button>
          );
        })
      )}
    </div>
  );
}

// ─── Song row ─────────────────────────────────────────────────────────────────

function SongRow({
  song,
  index,
  isActive,
  isPlaying,
  isFav,
  onSelect,
  onToggleFavorite,
  playlists,
  onAddToPlaylist,
}: {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isFav: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const gradient = thumbGradients[index % thumbGradients.length];

  return (
    <div
      onClick={onSelect}
      className={`relative flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-all duration-200 group ${
        isActive ? "bg-white/8" : "hover:bg-white/5"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex-shrink-0 shadow-md`} />

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium truncate ${isActive ? "text-white" : "text-white/75 group-hover:text-white/90"}`}>
          {song.title}
        </p>
        <p className="text-white/38 text-[11px] truncate">{song.artist}</p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && isPlaying ? (
          <SoundWave />
        ) : (
          <span className={`text-[11px] tabular-nums ${isActive ? "text-white/35" : "text-white/28 group-hover:text-white/40"}`}>
            {song.duration}
          </span>
        )}

        {/* Add to playlist */}
        {playlists.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddMenu((v) => !v); }}
              className="text-white/0 group-hover:text-white/30 hover:!text-teal-400 transition-all duration-200 p-0.5"
              title="Add to playlist"
            >
              <Plus size={12} />
            </button>
            {showAddMenu && (
              <AddToPlaylistMenu
                songId={song.id}
                playlists={playlists}
                onAdd={(plId) => { onAddToPlaylist(plId); setShowAddMenu(false); }}
                onClose={() => setShowAddMenu(false)}
              />
            )}
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`transition-all duration-200 ${
            isFav ? "text-rose-400 opacity-100" : "text-white/0 group-hover:text-white/30 hover:!text-rose-400"
          }`}
        >
          <Heart size={13} className={isFav ? "fill-rose-400" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Playlists tab ────────────────────────────────────────────────────────────

function PlaylistsView({
  user,
  allSongs,
  currentSongId,
  isPlaying,
  onSelectFromPlaylist,
}: {
  user: UserInfo | null | undefined;
  allSongs: Song[];
  currentSongId: number;
  isPlaying: boolean;
  onSelectFromPlaylist: (id: number, queue: Song[]) => void;
}) {
  const [playlists, setPlaylists]         = useState<Playlist[]>([]);
  const [loading, setLoading]             = useState(false);
  const [openId, setOpenId]               = useState<string | null>(null);      // expanded playlist
  const [newName, setNewName]             = useState("");
  const [creating, setCreating]           = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editName, setEditName]           = useState("");
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((data: Playlist[]) => setPlaylists(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4 px-6 text-center">
        <ListMusic size={30} className="text-white/15" />
        <p className="text-white/30 text-xs leading-relaxed">
          Log in to create and manage your playlists.
        </p>
        <Link
          href="/auth"
          className="flex items-center gap-1.5 text-xs text-teal-400/80 hover:text-teal-300 border border-teal-400/25 hover:border-teal-400/50 rounded-xl px-3 py-2 transition-all"
        >
          <LogIn size={12} /> Log in
        </Link>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json() as Playlist;
      if (res.ok) {
        setPlaylists((prev) => [{ ...data, songs: [] }, ...prev]);
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (openId === id) setOpenId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/playlists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setPlaylists((prev) => prev.map((p) => p.id === id ? { ...p, name: editName.trim() } : p));
    setEditingId(null);
  };

  const handleRemoveSong = async (playlistId: string, songId: number) => {
    await fetch(`/api/playlists/${playlistId}/songs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    setPlaylists((prev) => prev.map((p) =>
      p.id === playlistId ? { ...p, songs: p.songs.filter((s) => s.songId !== songId) } : p
    ));
  };

  // Expanded playlist view
  if (openId) {
    const pl = playlists.find((p) => p.id === openId);
    if (!pl) { setOpenId(null); return null; }
    const plSongs = pl.songs.map((ps) => ps.song).filter(Boolean);

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
          <button
            onClick={() => setOpenId(null)}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-white text-sm font-semibold flex-1 truncate">{pl.name}</p>
          {plSongs.length > 0 && (
            <button
              onClick={() => onSelectFromPlaylist(plSongs[0].id, plSongs)}
              className="flex items-center gap-1 text-[11px] text-teal-400/80 hover:text-teal-300 border border-teal-400/25 hover:border-teal-400/50 rounded-lg px-2 py-1 transition-all flex-shrink-0"
            >
              <Play size={9} className="fill-current" />
              Play
            </button>
          )}
          <span className="text-white/30 text-xs flex-shrink-0">{plSongs.length} songs</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {plSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2">
              <Music size={24} className="text-white/15" />
              <p className="text-white/25 text-xs">No songs yet</p>
            </div>
          ) : (
            plSongs.map((song, idx) => {
              const isActive = song.id === currentSongId;
              const gradient = thumbGradients[idx % thumbGradients.length];
              return (
                <div
                  key={song.id}
                  onClick={() => onSelectFromPlaylist(song.id, plSongs)}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer group transition-all ${
                    isActive ? "bg-white/8" : "hover:bg-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium truncate ${isActive ? "text-white" : "text-white/70"}`}>
                      {song.title}
                    </p>
                    <p className="text-white/35 text-[10px] truncate">{song.artist}</p>
                  </div>
                  {isActive && isPlaying ? (
                    <SoundWave />
                  ) : (
                    <span className="text-white/25 text-[10px] tabular-nums">{song.duration}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveSong(pl.id, song.id); }}
                    className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-rose-400 transition-all ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Playlist list view
  return (
    <div className="flex flex-col h-full">
      {/* Create form */}
      <div className="px-3 pt-3 pb-2 border-b border-white/6">
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New playlist name..."
            className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="w-8 h-8 flex items-center justify-center bg-teal-500/15 border border-teal-500/25 text-teal-300 rounded-xl hover:bg-teal-500/25 transition-all disabled:opacity-30"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={18} className="text-white/25 animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 gap-2">
            <ListMusic size={24} className="text-white/15" />
            <p className="text-white/25 text-xs">No playlists yet</p>
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              className="rounded-xl border border-white/6 bg-white/3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                {editingId === pl.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(pl.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    />
                    <button onClick={() => handleRename(pl.id)} className="text-teal-400 hover:text-teal-300 transition-colors">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white/60 transition-colors">
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setOpenId(pl.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-white/80 text-[13px] font-medium truncate hover:text-white transition-colors">
                        {pl.name}
                      </p>
                      <p className="text-white/30 text-[10px] mt-0.5">
                        {pl.songs.length} songs
                      </p>
                    </button>
                    <button
                      onClick={() => { setEditingId(pl.id); setEditName(pl.name); }}
                      className="text-white/20 hover:text-white/60 transition-colors p-1"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(pl.id)}
                      disabled={deletingId === pl.id}
                      className="text-white/20 hover:text-rose-400 transition-colors p-1 disabled:opacity-50"
                    >
                      {deletingId === pl.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlaylistPanel({
  songs, currentSongId, isPlaying, onSelect, onSelectFromPlaylist,
  show, onClose, favorites, onToggleFavorite,
  recent, activeTab, onTabChange, user,
}: Props) {
  const songMap = new Map(songs.map((s) => [s.id, s]));

  // Shared playlists state (for "Add to playlist" button in song rows)
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
      const song = songMap.get(songId);
      if (song) {
        setPlaylists((prev) => prev.map((p) =>
          p.id === playlistId && !p.songs.some((s) => s.songId === songId)
            ? { ...p, songs: [...p.songs, { playlistId, songId, addedAt: new Date().toISOString(), song }] }
            : p
        ));
      }
    }
  };

  const displayed: Song[] =
    activeTab === "favorites" ? songs.filter((s) => favorites.has(s.id))
    : activeTab === "recent"  ? recent.flatMap((id) => { const s = songMap.get(id); return s ? [s] : []; })
    : songs;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 lg:hidden ${
          show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside className={`
        glass-sidebar flex flex-col border-l border-white/5
        w-[min(280px,100dvw)] lg:w-[272px]
        fixed lg:relative inset-y-0 z-30 lg:h-full
        transition-transform duration-300 ease-in-out
        ${show ? "right-0 translate-x-0" : "right-[-1px] translate-x-full"}
      `}>
        {/* Tab bar */}
        <div className="flex items-center justify-between px-3 pt-4 pb-2 flex-shrink-0">
          <div className="flex gap-0.5 p-0.5 bg-white/6 rounded-xl flex-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  activeTab === id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/65"
                }`}
              >
                <Icon
                  size={10}
                  className={activeTab === id && id === "favorites" ? "fill-rose-400 text-rose-400" : ""}
                />
                {label}
                {id === "favorites" && favorites.size > 0 && (
                  <span className={`tabular-nums text-[10px] ${activeTab === id ? "text-white/60" : "text-white/25"}`}>
                    {favorites.size}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="lg:hidden ml-2 text-white/35 hover:text-white/60 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === "playlists" ? (
            <PlaylistsView
              user={user}
              allSongs={songs}
              currentSongId={currentSongId}
              isPlaying={isPlaying}
              onSelectFromPlaylist={onSelectFromPlaylist}
            />
          ) : (
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {displayed.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                displayed.map((song, index) => (
                  <SongRow
                    key={`${activeTab}-${song.id}`}
                    song={song}
                    index={index}
                    isActive={song.id === currentSongId}
                    isPlaying={isPlaying}
                    isFav={favorites.has(song.id)}
                    onSelect={() => onSelect(song.id)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                    playlists={playlists}
                    onAddToPlaylist={(plId) => handleAddToPlaylist(plId, song.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: PlaylistTab }) {
  if (tab === "favorites") return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Heart size={28} className="text-white/15" />
      <p className="text-white/25 text-xs text-center px-6">
        No favorite songs yet.<br />Press the heart to add one here.
      </p>
    </div>
  );

  if (tab === "recent") return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Clock size={28} className="text-white/15" />
      <p className="text-white/25 text-xs text-center px-6">
        No recent songs yet.<br />Start listening to build your history.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Music size={28} className="text-white/15" />
      <p className="text-white/25 text-xs">No songs available</p>
    </div>
  );
}
