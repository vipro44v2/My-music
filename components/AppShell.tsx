"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import type { CSSProperties, MouseEvent } from "react";
import {
  Home,
  Compass,
  ListMusic,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Timer,
  Sparkles,
  Headphones,
} from "lucide-react";
import type { Song } from "@/lib/songs";
import { DEFAULT_MOODS, type MoodDef } from "@/lib/moods";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { UserInfo } from "./TopBar";
import PlaylistPanel from "./PlaylistPanel";
import MusicPlayer from "./MusicPlayer";
import MoodCards from "./MoodCards";
import ExploreView from "./ExploreView";
import ChatWidget from "./ChatWidget";
import MoodMedia from "./MoodMedia";
import AmbienceMixer from "./AmbienceMixer";
import AuthForm from "@/app/auth/AuthForm";

interface MoodImagePosition {
  desktop: string;
  mobile: string;
}

function BottomNav({
  activeView,
  onHome,
  onExplore,
  onPlaylistToggle,
  onFavorites,
}: {
  activeView: "home" | "explore";
  onHome: () => void;
  onExplore: () => void;
  onPlaylistToggle: () => void;
  onFavorites: () => void;
}) {
  const items = [
    { icon: Home,      label: "Home",    active: activeView === "home",    onClick: onHome },
    { icon: Compass,   label: "Explore", active: activeView === "explore", onClick: onExplore },
    { icon: ListMusic, label: "Playlist", active: false,                   onClick: onPlaylistToggle },
    { icon: Heart,     label: "Favorites", active: false,                  onClick: onFavorites },
  ];
  return (
    <nav className="lg:hidden glass-player border-t border-white/8 flex items-center justify-around flex-shrink-0 safe-bottom">
      {items.map(({ icon: Icon, label, active, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1.5 py-2.5 transition-colors ${
            active ? "text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
          <span className="text-[9px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function SleepModeOverlay({
  song,
  isPlaying,
  progress,
  durationLabel,
  elapsedLabel,
  sleepTimerLabel,
  onClose,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onTimer,
}: {
  song: Song;
  isPlaying: boolean;
  progress: number;
  durationLabel: string;
  elapsedLabel: string;
  sleepTimerLabel: string;
  onClose: () => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (pct: number) => void;
  onTimer: () => void;
}) {
  const handleSeekClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek(((event.clientX - rect.left) / rect.width) * 100);
  };

  return (
    <div className="fixed inset-0 z-[70] flex h-dvh w-full flex-col items-center justify-between overflow-hidden bg-black/72 px-6 py-5 text-white backdrop-blur-[3px]">
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
      <div className="relative z-10 flex w-full items-center justify-between">
        <button
          onClick={onTimer}
          className={`flex h-10 items-center gap-2 rounded-full border px-3 text-xs transition-colors ${
            sleepTimerLabel === "Off"
              ? "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
              : "border-amber-300/25 bg-amber-300/10 text-amber-200"
          }`}
        >
          <Timer size={14} />
          {sleepTimerLabel}
        </button>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/45 transition-colors hover:text-white/80"
          title="Exit sleep UI"
        >
          <X size={17} />
        </button>
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 h-28 w-28 rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-300/20 via-sky-300/15 to-teal-300/20 shadow-2xl shadow-black/50" />
        <p className="max-w-full truncate text-xl font-semibold text-white">{song.title}</p>
        <p className="mt-1 max-w-full truncate text-sm text-white/45">{song.artist}</p>

        <div className="mt-10 w-full">
          <button
            onClick={handleSeekClick}
            className="block h-2 w-full rounded-full bg-white/12 text-left"
            aria-label="Seek"
          >
            <span
              className="block h-full rounded-full bg-indigo-200 shadow-[0_0_18px_rgba(199,210,254,0.55)]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </button>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-white/35">
            <span>{elapsedLabel}</span>
            <span>{durationLabel}</span>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-8">
          <button
            onClick={onPrev}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white/55 transition-colors hover:text-white"
          >
            <SkipBack size={25} strokeWidth={1.7} />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/12 shadow-2xl shadow-black/50 transition-all hover:bg-white/18"
          >
            {isPlaying ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
          </button>
          <button
            onClick={onNext}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white/55 transition-colors hover:text-white"
          >
            <SkipForward size={25} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <p className="relative z-10 safe-bottom text-[11px] text-white/25">Sleep UI</p>
    </div>
  );
}

function HomeStage({
  mood,
  song,
  songCount,
  isPlaying,
  onPlayPause,
}: {
  mood: MoodDef | undefined;
  song: Song;
  songCount: number;
  isPlaying: boolean;
  onPlayPause: () => void;
}) {
  return (
    <section className="pointer-events-none flex flex-1 items-end px-4 pb-4 pt-2 sm:px-6 lg:items-center lg:px-10 lg:pb-8">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/75 shadow-2xl shadow-black/25 backdrop-blur-2xl">
            <Sparkles size={13} className="text-emerald-300" />
            Gibli Chill
          </div>
          <h1 className="max-w-[11ch] text-[clamp(2.55rem,7vw,5.75rem)] font-black leading-[0.9] tracking-normal text-white drop-shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
            Quiet music for slow hours
          </h1>
          <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/68 drop-shadow lg:text-base">
            Pick a mood, let the room settle, and keep your playlist close without leaving the scene.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPlayPause}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-200/35 bg-emerald-300 px-5 text-sm font-bold text-emerald-950 shadow-[0_16px_44px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-200 active:translate-y-px"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isPlaying ? "Pause" : "Listen now"}
            </button>
            <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/24 px-4 text-xs font-semibold text-white/72 backdrop-blur-2xl">
              <Headphones size={14} className="text-emerald-200" />
              {songCount} tracks
            </div>
          </div>
        </div>

        <div className="pointer-events-auto hidden rounded-[1.5rem] border border-white/12 bg-black/26 p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Now tuned</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/20 bg-emerald-300/16 text-emerald-100 shadow-inner shadow-white/10">
              <Headphones size={22} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">{song.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/45">{song.artist}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs font-semibold text-white/55">{mood?.label ?? "Mood"}</span>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
              {isPlaying ? "Playing" : "Ready"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface AppShellProps {
  initialMoodImages?: Record<string, string>;
  songs?: Song[];
  user?: UserInfo | null;
}

export default function AppShell({ initialMoodImages = {}, songs: initialSongs = [], user = null }: AppShellProps) {
  const [sessionUser, setSessionUser]     = useState<UserInfo | null>(user);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [songs, setSongs]               = useState<Song[]>(initialSongs);
  const [customImages, setCustomImages] = useState<Record<string, string>>(initialMoodImages);
  const [imagePositions, setImagePositions] = useState<Record<string, MoodImagePosition>>({});
  const [moods, setMoods]               = useState<MoodDef[]>(DEFAULT_MOODS);
  const [favorites, setFavorites]       = useState<Set<number>>(new Set());
  const [recent, setRecent]             = useState<number[]>([]);
  const [playlistTab, setPlaylistTab]   = useState<"all" | "favorites" | "recent" | "playlists">("all");

  const [currentSongId, setCurrentSongId] = useState(initialSongs[0]?.id ?? 0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [progress, setProgress]           = useState(0);
  const [volume, setVolume]               = useState(70);
  const [showPlaylist, setShowPlaylist]   = useState(false);
  const [hasPlayed, setHasPlayed]         = useState(false);
  const [activeMood, setActiveMood]       = useState("chill");
  const [isFocused, setIsFocused]         = useState(false);
  const [showFocusControls, setShowFocusControls] = useState(false);
  const [isSleepMode, setIsSleepMode]     = useState(false);
  const [view, setView]                   = useState<"home" | "explore">("home");
  const [queue, setQueue]                 = useState<Song[] | null>(null);
  const [sleepTimerMode, setSleepTimerMode] = useState<"off" | "15" | "30" | "60" | "track">("off");
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load favorites and recent plays from the account, or localStorage for guests.
  useEffect(() => {
    if (sessionUser) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((songs: Song[]) => setFavorites(new Set(songs.map((s) => s.id))))
        .catch(() => {});
      fetch("/api/history")
        .then((r) => r.json())
        .then((rows: { songId: number }[]) => {
          const ids = [...new Set(rows.map((h) => h.songId))].slice(0, 30);
          setRecent(ids);
        })
        .catch(() => {});
    } else {
      try {
        const fav = localStorage.getItem("favorites");
        if (fav) setFavorites(new Set(JSON.parse(fav) as number[]));
        const rec = localStorage.getItem("recent");
        if (rec) setRecent(JSON.parse(rec) as number[]);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id]);

  // Open playlist panel on desktop after hydration
  useEffect(() => {
    if (window.innerWidth >= 1024) setShowPlaylist(true);
  }, []);

  // Fetch moods list on mount
  useEffect(() => {
    fetch("/api/moods")
      .then((r) => r.json())
      .then((list: MoodDef[]) => setMoods(list))
      .catch(() => {});
    fetch("/api/moods/positions")
      .then((r) => r.json())
      .then((positions: Record<string, MoodImagePosition>) => setImagePositions(positions))
      .catch(() => {});
  }, []);

  // Persist favorites to localStorage for guests.
  useEffect(() => {
    if (!sessionUser) {
      try { localStorage.setItem("favorites", JSON.stringify([...favorites])); } catch {}
    }
  }, [favorites, sessionUser]);

  // Track recent plays when current song changes
  const prevSongRef = useRef<number>(0);
  useEffect(() => {
    if (!currentSongId || currentSongId === prevSongRef.current) return;
    prevSongRef.current = currentSongId;
    setRecent((prev) => {
      const next = [currentSongId, ...prev.filter((id) => id !== currentSongId)].slice(0, 30);
      if (!sessionUser) {
        try { localStorage.setItem("recent", JSON.stringify(next)); } catch {}
      }
      return next;
    });
    if (sessionUser) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: currentSongId }),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongId]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const removing = next.has(id);
      if (removing) next.delete(id); else next.add(id);
      if (sessionUser) {
        fetch("/api/favorites", {
          method: removing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: id }),
        }).catch(() => {});
      }
      return next;
    });
  }, [sessionUser]);

  const handleNavClick = useCallback((navId: string) => {
    if (navId === "explore") {
      setView("explore");
    } else if (navId === "home") {
      setView("home");
    } else if (navId === "recent") {
      setPlaylistTab("recent");
      setShowPlaylist(true);
    } else if (navId === "favorites") {
      setPlaylistTab("favorites");
      setShowPlaylist(true);
    } else if (navId === "playlist") {
      setPlaylistTab("playlists");
      setShowPlaylist(true);
    }
  }, []);

  const currentSong = songs.find((s) => s.id === currentSongId) ?? songs[0];
  const activeMoodDef = moods.find((mood) => mood.id === activeMood);

  useEffect(() => {
    if (!isSleepMode) return;
    setShowPlaylist(false);
    setIsFocused(false);
  }, [isSleepMode]);

  useEffect(() => {
    if (!isFocused) {
      setShowFocusControls(false);
      return;
    }

    setShowFocusControls(true);
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !showFocusControls) return;
    const timeoutId = window.setTimeout(() => setShowFocusControls(false), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [isFocused, showFocusControls]);

  const revealFocusControls = useCallback(() => {
    if (!isFocused) return;
    setShowFocusControls(true);
  }, [isFocused]);

  // ── SSE: realtime updates from admin ──────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string };
        if (event.type === "moods") {
          fetch("/api/moods/images")
            .then((r) => r.json())
            .then((imgs: Record<string, string>) => setCustomImages(imgs))
            .catch(() => {});
          fetch("/api/moods/positions")
            .then((r) => r.json())
            .then((positions: Record<string, MoodImagePosition>) => setImagePositions(positions))
            .catch(() => {});
          fetch("/api/moods")
            .then((r) => r.json())
            .then((list: MoodDef[]) => setMoods(list))
            .catch(() => {});
        }
        if (event.type === "songs") {
          fetch("/api/songs")
            .then((r) => r.json())
            .then((list: Song[]) => {
              setSongs(list);
              setCurrentSongId((id) =>
                list.find((s) => s.id === id) ? id : (list[0]?.id ?? 0)
              );
              // Keep queue in sync — remove deleted songs, refresh song objects
              setQueue((q) => {
                if (!q) return null;
                const map = new Map(list.map((s) => [s.id, s]));
                const updated = q.map((s) => map.get(s.id)).filter(Boolean) as Song[];
                return updated.length > 0 ? updated : null;
              });
            })
            .catch(() => {});
        }
      } catch {}
    };

    es.onerror = () => {};

    return () => es.close();
  }, []);

  // ── Audio ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      setHasPlayed(true);
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Load new src and always auto-play when song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.src;
    audio.load();
    setProgress(0);
    setIsPlaying(true);
    audio.play().catch(() => setIsPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const handleEnded = useCallback(() => {
    if (sleepTimerMode === "track") {
      setIsPlaying(false);
      setSleepTimerMode("off");
      setSleepTimerEndsAt(null);
      return;
    }
    const q = queue ?? songs;
    const idx = q.findIndex((s) => s.id === currentSongId);
    if (q.length > 0) setCurrentSongId(q[(idx + 1) % q.length].id);
  }, [queue, songs, currentSongId, sleepTimerMode]);

  useEffect(() => {
    if (!sleepTimerEndsAt) return;

    const tick = () => {
      const now = Date.now();
      const remainingMs = sleepTimerEndsAt - now;
      if (remainingMs <= 0) {
        setIsPlaying(false);
        setSleepTimerMode("off");
        setSleepTimerEndsAt(null);
        return;
      }
      setTimerNow(now);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [sleepTimerEndsAt]);

  const cycleSleepTimer = useCallback(() => {
    const modes: typeof sleepTimerMode[] = ["off", "15", "30", "60", "track"];
    const next = modes[(modes.indexOf(sleepTimerMode) + 1) % modes.length];
    setSleepTimerMode(next);
    setSleepTimerEndsAt(
      next === "15" || next === "30" || next === "60"
        ? Date.now() + Number(next) * 60 * 1000
        : null
    );
  }, [sleepTimerMode]);

  const sleepTimerLabel =
    sleepTimerMode === "off" ? "Off"
    : sleepTimerMode === "track" ? "End of song"
    : (() => {
        const remainingMs = Math.max(0, (sleepTimerEndsAt ?? timerNow) - timerNow);
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${String(secs).padStart(2, "0")}`;
      })();

  const handleSeek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
    setProgress(pct);
  }, []);

  const closeOnMobile = useCallback(() => {
    if (window.innerWidth < 1024) setShowPlaylist(false);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setQueue(null);
    if (id === currentSongId) setIsPlaying(true);
    else setCurrentSongId(id);
    closeOnMobile();
  }, [currentSongId, closeOnMobile]);

  const handleSelectFromPlaylist = useCallback((id: number, playlistSongs: Song[]) => {
    setQueue(playlistSongs);
    setCurrentSongId(id);
    closeOnMobile();
  }, [closeOnMobile]);

  const handlePrev = useCallback(() => {
    const q = queue ?? songs;
    const idx = q.findIndex((s) => s.id === currentSongId);
    if (q.length > 0) setCurrentSongId(q[(idx - 1 + q.length) % q.length].id);
  }, [queue, songs, currentSongId]);

  const handleNext = useCallback(() => {
    const q = queue ?? songs;
    const idx = q.findIndex((s) => s.id === currentSongId);
    if (q.length > 0) setCurrentSongId(q[(idx + 1) % q.length].id);
  }, [queue, songs, currentSongId]);

  if (!currentSong) {
    return (
      <div className="relative z-10 h-full flex items-center justify-center">
        <p className="text-white/30 text-sm">No songs available</p>
      </div>
    );
  }

  const totalSecs = (() => {
    const [mins, secs] = currentSong.duration.split(":").map(Number);
    return (mins || 0) * 60 + (secs || 0);
  })();
  const elapsedSecs = Math.round((progress / 100) * totalSecs);
  const elapsedLabel = `${Math.floor(elapsedSecs / 60)}:${String(elapsedSecs % 60).padStart(2, "0")}`;

  return (
    <>
      <audio ref={audioRef} src={currentSong.src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      {!isSleepMode && <ChatWidget user={sessionUser} />}
      {!isSleepMode && <AmbienceMixer />}

      {/* ── Background ─────────────────────────────────── */}
      <div className="fixed inset-0 z-0 h-dvh w-full max-w-dvw overflow-hidden">
        <MoodMedia src="/8642963.gif" alt="background" className="absolute inset-0 w-full h-full object-cover" />

        {moods.map((mood) => {
          const src = customImages[mood.id] ?? mood.fallback ?? null;
          if (!src) return null;
          return (
            <MoodMedia
              key={`${mood.id}-${src}`}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover [object-position:var(--mood-position-mobile)] lg:[object-position:var(--mood-position-desktop)] transition-opacity duration-700 ${
                activeMood === mood.id ? "opacity-100" : "opacity-0"
              }`}
              style={{
                "--mood-position-mobile": imagePositions[mood.id]?.mobile ?? "center center",
                "--mood-position-desktop": imagePositions[mood.id]?.desktop ?? "center center",
              } as CSSProperties}
            />
          );
        })}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.16),transparent_24rem),linear-gradient(90deg,rgba(0,0,0,0.64),rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.58))]" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/78 via-black/28 to-transparent" />
        <div className={`absolute inset-0 bg-black transition-opacity duration-700 ${
          isSleepMode ? "opacity-45" : "opacity-0 pointer-events-none"
        }`} />

        {/* Cover background when in Explore view */}
        <div className={`absolute inset-0 bg-[#070a08] transition-opacity duration-500 ${
          view === "explore" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`} />
      </div>

      {/* ── App shell ──────────────────────────────────── */}
      <div className={`relative z-10 h-full w-full max-w-dvw overflow-hidden flex flex-col transition-opacity duration-500 ${
        isSleepMode ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
        {isFocused && (
          <button
            type="button"
            aria-label="Show player controls"
            onClick={revealFocusControls}
            className="fixed inset-x-0 top-0 bottom-[72px] z-20 cursor-default bg-transparent lg:hidden"
          />
        )}
        {isFocused && showFocusControls && (
          <div className="fixed inset-x-0 bottom-[142px] z-30 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden" style={{ scrollbarWidth: "none" }}>
            {moods.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={() => {
                  setActiveMood(mood.id);
                  setIsFocused(false);
                  setShowFocusControls(true);
                }}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg shadow-black/30 backdrop-blur-md transition-colors ${
                  activeMood === mood.id
                    ? "border-white/35 bg-white/20 text-white"
                    : "border-white/10 bg-black/30 text-white/55"
                }`}
              >
                {mood.label}
              </button>
            ))}
          </div>
        )}
        <div className={`flex flex-1 min-h-0 overflow-hidden transition-all duration-500 ${
          isFocused ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        }`}>
          <Sidebar moods={moods} activeMood={activeMood} onMoodChange={setActiveMood} onNavClick={handleNavClick} />

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar
              onPlaylistToggle={() => setShowPlaylist((p) => !p)}
              showPanel={showPlaylist}
              user={sessionUser}
              songs={songs}
              onSelect={handleSelect}
              onLoginClick={() => setShowAuthModal(true)}
              onLogout={() => setSessionUser(null)}
            />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {view === "explore" ? (
                <ExploreView
                  songs={songs}
                  moods={moods}
                  customImages={customImages}
                  currentSongId={currentSongId}
                  isPlaying={isPlaying}
                  onSelect={handleSelect}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  user={sessionUser}
                />
              ) : (
                <div className="flex h-full min-h-0 flex-col justify-end">
                  <HomeStage
                    mood={activeMoodDef}
                    song={currentSong}
                    songCount={songs.length}
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying((p) => !p)}
                  />
                  <MoodCards moods={moods} activeMood={activeMood} onMoodChange={setActiveMood} customImages={customImages} />
                </div>
              )}
            </div>
          </main>

          {/* Desktop: inside the flex-1 row → height naturally stops at the player */}
          <div className="hidden lg:flex flex-shrink-0 relative">
            {/* Toggle tab — vertically centered on the left edge, always visible */}
            <button
              onClick={() => setShowPlaylist((p) => !p)}
            className="absolute left-0 top-1/2 z-10 flex h-14 w-5 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-2xl border-y border-l border-white/15 bg-black/28 text-white/50 shadow-xl shadow-black/30 backdrop-blur-xl transition-all duration-200 hover:border-emerald-300/35 hover:bg-emerald-300/12 hover:text-emerald-200"
            >
              {showPlaylist ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>

            <div className={`overflow-hidden transition-[width] duration-300 ease-in-out ${showPlaylist ? "w-[272px]" : "w-0"}`}>
              <PlaylistPanel
                songs={songs}
                currentSongId={currentSongId}
                isPlaying={isPlaying}
                onSelect={handleSelect}
                onSelectFromPlaylist={handleSelectFromPlaylist}
                show={showPlaylist}
                onClose={() => setShowPlaylist(false)}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                recent={recent}
                activeTab={playlistTab}
                onTabChange={setPlaylistTab}
                user={sessionUser}
              />
            </div>
          </div>

          {/* Mobile: PlaylistPanel handles its own fixed positioning */}
          <div className="lg:hidden contents">
            <PlaylistPanel
              songs={songs}
              currentSongId={currentSongId}
              isPlaying={isPlaying}
              onSelect={handleSelect}
              onSelectFromPlaylist={handleSelectFromPlaylist}
              show={showPlaylist}
              onClose={() => setShowPlaylist(false)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              recent={recent}
              activeTab={playlistTab}
              onTabChange={setPlaylistTab}
              user={sessionUser}
            />
          </div>
        </div>

        <div className="flex-shrink-0">
          {/* Music player — slides in on first play, hidden before that */}
          <div className={`grid transition-all duration-500 ${hasPlayed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className={`overflow-hidden transition-all duration-500 ${
              isFocused
                ? showFocusControls
                  ? "relative z-30 opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3 lg:hover:opacity-100 lg:hover:translate-y-0"
                : ""
            }`}>
              <MusicPlayer
                song={currentSong}
                isPlaying={isPlaying}
                progress={progress}
                volume={volume}
                onPlayPause={() => setIsPlaying((p) => !p)}
                onSeek={handleSeek}
                onVolumeChange={setVolume}
                onPrev={handlePrev}
                onNext={handleNext}
                isFocused={isFocused}
                onFocusToggle={() => setIsFocused((f) => !f)}
                sleepTimerLabel={sleepTimerLabel}
                onSleepTimerCycle={cycleSleepTimer}
                isSleepMode={isSleepMode}
                onSleepModeToggle={() => setIsSleepMode(true)}
              />
            </div>
          </div>
          <BottomNav
            activeView={view}
            onHome={() => { setIsFocused(false); setView("home"); }}
            onExplore={() => { setIsFocused(false); setView("explore"); }}
            onPlaylistToggle={() => { setIsFocused(false); setPlaylistTab("playlists"); setShowPlaylist((p) => !p); }}
            onFavorites={() => { setIsFocused(false); setPlaylistTab("favorites"); setShowPlaylist(true); }}
          />
        </div>
      </div>
      {isSleepMode && (
        <SleepModeOverlay
          song={currentSong}
          isPlaying={isPlaying}
          progress={progress}
          durationLabel={currentSong.duration}
          elapsedLabel={elapsedLabel}
          sleepTimerLabel={sleepTimerLabel}
          onClose={() => setIsSleepMode(false)}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onTimer={cycleSleepTimer}
        />
      )}
      {showAuthModal && !sessionUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/72 px-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close login"
            onClick={() => setShowAuthModal(false)}
            className="absolute inset-0 z-0 cursor-default"
          />
          <div className="relative z-10 w-full max-w-[360px]">
            <button
              type="button"
              aria-label="Close login"
              onClick={() => setShowAuthModal(false)}
              className="absolute -right-2 -top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/70 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all hover:border-white/30 hover:bg-black/90 hover:text-white active:translate-y-px"
            >
              <X size={17} />
            </button>
            <Suspense>
              <AuthForm
                embedded
                onCancel={() => setShowAuthModal(false)}
                onSuccess={(nextUser) => {
                  setSessionUser(nextUser);
                  setShowAuthModal(false);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
