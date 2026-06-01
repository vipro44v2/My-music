"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ListMusic, LogOut, User, Settings, X, Music2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Song } from "@/lib/songs";

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

const gradients = [
  "from-sky-500 to-teal-600",
  "from-emerald-500 to-green-700",
  "from-blue-500 to-indigo-700",
  "from-cyan-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-700",
  "from-lime-500 to-green-600",
];

interface Props {
  onPlaylistToggle: () => void;
  showPanel?: boolean;
  user?: UserInfo | null;
  songs?: Song[];
  onSelect?: (id: number) => void;
  onLoginClick?: () => void;
  onLogout?: () => void;
}

export default function TopBar({ onPlaylistToggle, showPanel = true, user, songs = [], onSelect, onLoginClick, onLogout }: Props) {
  const [query, setQuery]           = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const router    = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const trimmed = query.trim();
  const results = trimmed.length > 0
    ? songs.filter((s) =>
        s.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        s.artist.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (id: number) => {
    onSelect?.(id);
    setQuery("");
    setShowResults(false);
  };

  const clearSearch = () => {
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setShowMenu(false);
    setLoggingOut(false);
    if (onLogout) onLogout();
    else router.refresh();
  };

  const initial     = (user?.name ?? user?.email ?? "?")[0].toUpperCase();
  const displayName = user?.name ?? user?.email ?? "";

  return (
    <div className="flex flex-shrink-0 items-center gap-3 px-4 pb-3 pt-4 lg:px-6">

      {/* Search */}
      <div className="flex-1 relative" ref={searchRef}>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none z-10"
          size={14}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => { if (trimmed) setShowResults(true); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") clearSearch();
            if (e.key === "Enter" && results.length > 0) handleSelect(results[0].id);
          }}
          placeholder="Search songs, artists..."
          className="w-full rounded-full border border-white/15 bg-black/22 py-2.5 pl-9 pr-8 text-sm text-white shadow-xl shadow-black/10 backdrop-blur-2xl transition-colors placeholder:text-white/42 focus:border-emerald-300/45 focus:bg-white/10 focus:outline-none"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={13} />
          </button>
        )}

        {/* Dropdown */}
        {showResults && results.length > 0 && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-3xl border border-white/12 shadow-2xl shadow-black/60"
            style={{ background: "rgba(7,10,8,0.94)", backdropFilter: "blur(24px)" }}
          >
            {results.map((song, idx) => (
              <button
                key={song.id}
                onClick={() => handleSelect(song.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition-colors text-left group"
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]}`}>
                  <Music2 size={13} className="text-white/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate group-hover:text-white transition-colors">
                    {song.title}
                  </p>
                  <p className="text-white/38 text-xs truncate">{song.artist}</p>
                </div>
                <span className="text-white/28 text-xs flex-shrink-0 tabular-nums">{song.duration}</span>
              </button>
            ))}
          </div>
        )}

        {showResults && trimmed.length > 0 && results.length === 0 && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-3xl border border-white/12 px-4 py-5 text-center shadow-2xl shadow-black/60"
            style={{ background: "rgba(7,10,8,0.94)", backdropFilter: "blur(24px)" }}
          >
            <p className="text-white/30 text-sm">No results found</p>
          </div>
        )}
      </div>

      {/* Panel toggle — mobile only */}
      <button
        onClick={onPlaylistToggle}
        title={showPanel ? "Hide list" : "Show list"}
          className={`glass-input flex h-10 w-10 items-center justify-center rounded-full border transition-all active:translate-y-px lg:hidden ${
          showPanel
            ? "border-white/18 text-white/60 hover:border-white/30 hover:text-white/80"
            : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/60"
        }`}
      >
        <ListMusic size={16} />
      </button>

      {/* Auth area */}
      {user ? (
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="glass-input flex items-center gap-1.5 rounded-full border border-white/12 py-0.5 pl-0.5 pr-2.5 transition-all hover:border-white/25 active:translate-y-px"
          >
            <div className="flex h-7 w-7 select-none items-center justify-center rounded-full bg-emerald-300 text-xs font-black text-emerald-950">
              {initial}
            </div>
            <span className="hidden lg:block text-white/70 text-xs max-w-[90px] truncate">
              {displayName}
            </span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-3xl border border-white/12 py-1.5 shadow-2xl shadow-black/60"
              style={{ background: "rgba(7,10,8,0.94)", backdropFilter: "blur(22px)" }}
            >
              <div className="px-4 py-3 border-b border-white/8">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-black text-emerald-950">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {user.name ?? "User"}
                    </p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                {user.role === "admin" && (
                  <Link
                    href="/settings"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors"
                  >
                    <Settings size={14} />
                    Settings
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/50 hover:text-rose-400 hover:bg-rose-400/5 text-sm transition-colors disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onLoginClick}
          className="glass-input flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-sm text-white/62 transition-all hover:border-white/25 hover:text-white active:translate-y-px"
        >
          <User size={14} />
          <span className="hidden lg:inline">Log in</span>
        </button>
      )}
    </div>
  );
}
