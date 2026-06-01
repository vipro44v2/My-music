"use client";

import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Volume2,
  Maximize2,
  Minimize2,
  Music2,
  Timer,
  Moon,
} from "lucide-react";
import { useRef, useCallback } from "react";
import type { Song } from "@/lib/songs";

interface Props {
  song: Song;
  isPlaying: boolean;
  progress: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (pct: number) => void;
  onVolumeChange: (vol: number) => void;
  onPrev: () => void;
  onNext: () => void;
  isFocused?: boolean;
  onFocusToggle?: () => void;
  sleepTimerLabel?: string;
  onSleepTimerCycle?: () => void;
  isSleepMode?: boolean;
  onSleepModeToggle?: () => void;
}

function parseDurationSecs(dur: string) {
  const [m, s] = dur.split(":").map(Number);
  return m * 60 + s;
}

function formatTime(pct: number, totalSecs: number) {
  const secs = Math.round((pct / 100) * totalSecs);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function DragSlider({
  value,
  onChange,
  className = "",
  trackColor = "bg-white/15",
  fillColor = "bg-white/50",
  thumbColor = "bg-white",
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const calcValue = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(calcValue(e.clientX));
  }, [calcValue, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    onChange(calcValue(e.clientX));
  }, [calcValue, onChange]);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={`relative h-1.5 ${trackColor} rounded-full cursor-pointer group touch-none ${className}`}
      style={{ userSelect: "none" }}
    >
      <div
        className={`h-full ${fillColor} rounded-full relative`}
        style={{ width: `${value}%` }}
      >
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 ${thumbColor} rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150`} />
      </div>
    </div>
  );
}

function ProgressBar({
  progress,
  onSeek,
  className = "",
}: {
  progress: number;
  onSeek: (pct: number) => void;
  className?: string;
}) {
  return (
    <DragSlider
      value={progress}
      onChange={onSeek}
      className={className}
      fillColor="bg-emerald-300"
      thumbColor="bg-emerald-200"
    />
  );
}

export default function MusicPlayer({
  song,
  isPlaying,
  progress,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onPrev,
  onNext,
  isFocused = false,
  onFocusToggle,
  sleepTimerLabel = "Off",
  onSleepTimerCycle,
  isSleepMode = false,
  onSleepModeToggle,
}: Props) {
  const totalSecs = parseDurationSecs(song.duration);

  return (
    <div className="glass-player border-t border-white/8 flex-shrink-0 relative overflow-hidden">
      {isPlaying && (
        <div className="player-running-sticker hidden lg:flex" aria-hidden="true">
          <Music2 size={18} />
        </div>
      )}

      {/* ── Mobile layout ─────────────────────────────── */}
      <div className="lg:hidden px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Thumbnail */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex-shrink-0 shadow-lg shadow-teal-900/50" />

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate">{song.title}</p>
            <p className="text-white/40 text-[11px] truncate">{song.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onSleepTimerCycle && (
              <button
                onClick={onSleepTimerCycle}
                className={`w-7 h-8 flex items-center justify-center transition-colors ${
                  sleepTimerLabel === "Off" ? "text-white/35 hover:text-white/70" : "text-amber-300 hover:text-amber-200"
                }`}
                title={`Sleep timer: ${sleepTimerLabel}`}
              >
                <Timer size={17} />
              </button>
            )}
            <button
              onClick={onPrev}
              className="w-7 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <SkipBack size={19} strokeWidth={1.8} />
            </button>
            <button
              onClick={onPlayPause}
              className="w-9 h-9 rounded-full border border-white/25 bg-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all shadow-lg"
            >
              {isPlaying ? (
                <Pause size={17} className="text-white" />
              ) : (
                <Play size={17} className="text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              className="w-7 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <SkipForward size={19} strokeWidth={1.8} />
            </button>
            {onFocusToggle && (
              <button
                onClick={onFocusToggle}
                className="hidden min-[340px]:flex w-7 h-8 items-center justify-center text-white/45 hover:text-white/80 transition-colors"
              >
                {isFocused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            )}
            {onSleepModeToggle && (
              <button
                onClick={onSleepModeToggle}
                className={`w-7 h-8 flex items-center justify-center transition-colors ${
                  isSleepMode ? "text-indigo-200" : "text-white/35 hover:text-white/70"
                }`}
                title="Sleep UI"
              >
                <Moon size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <span className="text-white/35 text-[10px] tabular-nums w-7 text-right">
            {formatTime(progress, totalSecs)}
          </span>
          <ProgressBar progress={progress} onSeek={onSeek} className="flex-1" />
          <span className="text-white/35 text-[10px] tabular-nums w-7">
            {song.duration}
          </span>
        </div>
      </div>

      {/* ── Desktop layout ────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-4 px-6 py-3.5">
        {/* Album Art & Info */}
        <div className="flex items-center gap-3 w-52 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex-shrink-0 shadow-lg shadow-teal-900/50" />
          <div className="min-w-0">
            <p className="text-white text-[13px] font-semibold truncate">{song.title}</p>
            <p className="text-white/40 text-[11px] truncate">{song.artist} / Gibli Vibes</p>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-5">
            <button className="text-white/35 hover:text-white/70 transition-colors">
              <Shuffle size={17} />
            </button>
            <button onClick={onPrev} className="text-white/60 hover:text-white transition-colors">
              <SkipBack size={20} strokeWidth={1.8} />
            </button>
            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full border border-white/25 bg-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all duration-200 shadow-lg"
            >
              {isPlaying ? (
                <Pause size={18} className="text-white" />
              ) : (
                <Play size={18} className="text-white ml-0.5" />
              )}
            </button>
            <button onClick={onNext} className="text-white/60 hover:text-white transition-colors">
              <SkipForward size={20} strokeWidth={1.8} />
            </button>
            <button className="text-white/35 hover:text-white/70 transition-colors">
              <Repeat size={17} />
            </button>
            {onSleepTimerCycle && (
              <button
                onClick={onSleepTimerCycle}
                className={`transition-colors ${
                  sleepTimerLabel === "Off" ? "text-white/35 hover:text-white/70" : "text-amber-300 hover:text-amber-200"
                }`}
                title={`Sleep timer: ${sleepTimerLabel}`}
              >
                <Timer size={17} />
              </button>
            )}
          </div>

          <div className="w-full flex items-center gap-3 max-w-sm">
            <span className="text-white/35 text-[11px] w-8 text-right tabular-nums">
              {formatTime(progress, totalSecs)}
            </span>
            <ProgressBar progress={progress} onSeek={onSeek} className="flex-1" />
            <span className="text-white/35 text-[11px] w-8 tabular-nums">{song.duration}</span>
          </div>
          {sleepTimerLabel !== "Off" && (
            <p className="text-amber-300/75 text-[10px] leading-none">Sleep timer {sleepTimerLabel}</p>
          )}
        </div>

        {/* Volume + Focus */}
        <div className="flex items-center gap-2.5 w-36 flex-shrink-0 justify-end">
          <Volume2 size={15} className="text-white/35 flex-shrink-0" />
          <DragSlider value={volume} onChange={onVolumeChange} className="flex-1" />
          {onFocusToggle && (
            <button
              onClick={onFocusToggle}
              className="text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
              title={isFocused ? "Exit focus" : "Focus mode"}
            >
              {isFocused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          {onSleepModeToggle && (
            <button
              onClick={onSleepModeToggle}
              className={`transition-colors flex-shrink-0 ${
                isSleepMode ? "text-indigo-200" : "text-white/35 hover:text-white/70"
              }`}
              title="Sleep UI"
            >
              <Moon size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
