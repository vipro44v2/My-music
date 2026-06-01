"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight,
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles, type LucideIcon,
} from "lucide-react";
import type { MoodDef } from "@/lib/moods";
import MoodMedia from "./MoodMedia";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles,
};

interface Props {
  moods: MoodDef[];
  activeMood: string;
  onMoodChange: (id: string) => void;
  customImages?: Record<string, string>;
}

export default function MoodCards({ moods, activeMood, onMoodChange, customImages = {} }: Props) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll active card into view when mood changes (e.g. from sidebar)
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current.get(activeMood);
    if (!track || !card) return;

    const left = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
  }, [activeMood]);

  const slide = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  return (
    <div className="flex-shrink-0 select-none pb-4 lg:pb-6">
      <div className="mb-3 flex items-center justify-between px-4 lg:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">
          Mood
        </p>
        <p className="hidden text-xs font-medium text-white/38 sm:block">
          Choose the room before the track
        </p>
      </div>

      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute bottom-1 left-0 top-0 z-10 w-14 bg-gradient-to-r from-black/68 to-transparent" />

        {/* Prev */}
        <button
          onClick={() => slide(-1)}
          className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/46 text-white/62 shadow-xl shadow-black/30 backdrop-blur-xl transition-all duration-150 hover:bg-black/70 hover:text-white active:scale-95"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Track */}
        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-auto overscroll-x-contain px-10 pb-1 lg:px-12"
          style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
        >
          {moods.map((mood) => (
            <MoodCard
              key={mood.id}
              mood={mood}
              isActive={activeMood === mood.id}
              customImages={customImages}
              onMoodChange={onMoodChange}
              cardRef={(el) => {
                if (el) cardRefs.current.set(mood.id, el);
                else cardRefs.current.delete(mood.id);
              }}
            />
          ))}
        </div>

        {/* Right fade */}
        <div className="pointer-events-none absolute bottom-1 right-0 top-0 z-10 w-14 bg-gradient-to-l from-black/68 to-transparent" />

        {/* Next */}
        <button
          onClick={() => slide(1)}
          className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/46 text-white/62 shadow-xl shadow-black/30 backdrop-blur-xl transition-all duration-150 hover:bg-black/70 hover:text-white active:scale-95"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function MoodCard({ mood, isActive, customImages, onMoodChange, cardRef }: {
  mood: MoodDef;
  isActive: boolean;
  customImages: Record<string, string>;
  onMoodChange: (id: string) => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  const Icon   = ICON_MAP[mood.icon] ?? Cloud;
  const imgSrc = customImages[mood.id] ?? mood.fallback ?? null;

  return (
    <button
      ref={cardRef}
      onClick={() => onMoodChange(mood.id)}
      style={{ scrollSnapAlign: "start" }}
      className={`relative h-28 w-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-[1.5rem] text-left lg:h-36 lg:w-48
        transition-all duration-300
        ${isActive
          ? "scale-[1.035] border border-emerald-200/40 shadow-2xl shadow-black/50 ring-2 ring-emerald-200/55 brightness-110"
          : "border border-white/12 opacity-68 shadow-xl shadow-black/20 hover:scale-[1.018] hover:border-white/25 hover:opacity-95"
        }`}
    >
      {imgSrc && (
        <MoodMedia
          src={imgSrc}
          alt={mood.label}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className={`absolute inset-0 bg-gradient-to-br ${mood.overlay} transition-opacity duration-300 ${isActive ? "opacity-55" : "opacity-90"}`} />
      {isActive && <div className="absolute inset-0 rounded-[1.5rem] ring-2 ring-white/10" />}

      <div className="absolute inset-0 flex flex-col justify-end p-3.5">
        <Icon size={15} className="mb-1 text-white/86" strokeWidth={1.8} />
        <p className="text-white text-[13px] font-semibold leading-tight drop-shadow">{mood.label}</p>
        <p className="text-white/55 text-[10px] mt-0.5 leading-tight drop-shadow">{mood.desc}</p>
      </div>
    </button>
  );
}
