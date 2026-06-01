"use client";

import { useState } from "react";
import {
  Home, Compass, ListMusic, Heart, Clock,
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles, type LucideIcon,
} from "lucide-react";
import type { MoodDef } from "@/lib/moods";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Sun, Moon, Star, Flame, Zap, Wind,
  Music, Headphones, Heart, Coffee, CloudRain,
  Leaf, Waves, BookOpen, Sparkles,
};

const navItems = [
  { icon: Home,      label: "Home",      id: "home" },
  { icon: Compass,   label: "Explore",   id: "explore" },
  { icon: ListMusic, label: "Playlist",  id: "playlist" },
  { icon: Heart,     label: "Favorites", id: "favorites" },
  { icon: Clock,     label: "Recent",    id: "recent" },
];

interface Props {
  moods: MoodDef[];
  activeMood: string;
  onMoodChange: (id: string) => void;
  onNavClick?: (id: string) => void;
}

function NavBtn({
  icon: Icon, label, active, onClick,
}: { icon: LucideIcon; label: string; active: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative group flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 active:translate-y-px ${
        active ? "bg-emerald-300/18 text-emerald-50 shadow-inner shadow-white/10 ring-1 ring-emerald-200/20" : "text-white/42 hover:bg-white/8 hover:text-white/82"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span className="pointer-events-none absolute left-12 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-black/80 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl shadow-black/30 backdrop-blur-xl transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

export default function Sidebar({ moods, activeMood, onMoodChange, onNavClick }: Props) {
  const [activeNav, setActiveNav] = useState("home");

  return (
    <aside className="glass-sidebar hidden w-[68px] flex-shrink-0 flex-col items-center gap-1 border-r border-white/8 py-4 lg:flex">
      {/* Logo */}
      <div className="mb-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-200/25 bg-emerald-300 text-emerald-950 shadow-[0_18px_44px_rgba(16,185,129,0.24)]">
        <span className="text-sm font-black">G</span>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavBtn
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeNav === item.id}
            onClick={() => { setActiveNav(item.id); onNavClick?.(item.id); }}
          />
        ))}
      </div>

      <div className="w-6 border-t border-white/10 my-2" />

      {/* Moods */}
      <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {moods.map((mood) => {
          const Icon = ICON_MAP[mood.icon] ?? Cloud;
          return (
            <NavBtn
              key={mood.id}
              icon={Icon}
              label={mood.label}
              active={activeMood === mood.id}
              onClick={() => onMoodChange(mood.id)}
            />
          );
        })}
      </div>
    </aside>
  );
}
