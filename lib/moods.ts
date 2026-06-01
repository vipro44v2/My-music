export interface MoodDef {
  id: string;
  label: string;
  icon: string;
  overlay: string;
  desc: string;
  isDefault: boolean;
  fallback?: string;
}

export const DEFAULT_MOODS: MoodDef[] = [
  { id: "chill",  label: "Chill",  icon: "Cloud",     overlay: "from-sky-900/50 to-teal-900/60",      desc: "Relax & unwind",      isDefault: true, fallback: "/moods/chill.jpg" },
  { id: "study",  label: "Study",  icon: "BookOpen",  overlay: "from-amber-900/50 to-orange-900/60",  desc: "Focus & concentrate", isDefault: true, fallback: "/moods/study.jpg" },
  { id: "rainy",  label: "Rainy",  icon: "CloudRain", overlay: "from-slate-900/50 to-blue-900/60",    desc: "Rainy day vibes",     isDefault: true, fallback: "/moods/rainy.jpg" },
  { id: "sleep",  label: "Sleep",  icon: "Moon",      overlay: "from-indigo-900/60 to-purple-900/70", desc: "Drift off to sleep",  isDefault: true, fallback: "/moods/sleep.jpg" },
  { id: "nature", label: "Nature", icon: "Leaf",      overlay: "from-green-900/50 to-emerald-900/60", desc: "Into the wild",       isDefault: true, fallback: "/moods/nature.jpg" },
];

export const ICON_OPTIONS = [
  "Cloud", "Sun", "Moon", "Star", "Flame", "Zap", "Wind",
  "Music", "Headphones", "Heart", "Coffee", "CloudRain",
  "Leaf", "Waves", "BookOpen", "Sparkles",
] as const;

export const OVERLAY_OPTIONS = [
  { label: "Sky / Teal",       value: "from-sky-900/50 to-teal-900/60" },
  { label: "Amber / Orange",   value: "from-amber-900/50 to-orange-900/60" },
  { label: "Slate / Blue",     value: "from-slate-900/50 to-blue-900/60" },
  { label: "Indigo / Purple",  value: "from-indigo-900/60 to-purple-900/70" },
  { label: "Green / Emerald",  value: "from-green-900/50 to-emerald-900/60" },
  { label: "Rose / Pink",      value: "from-rose-900/50 to-pink-900/60" },
  { label: "Violet / Fuchsia", value: "from-violet-900/50 to-fuchsia-900/60" },
  { label: "Yellow / Lime",    value: "from-yellow-900/50 to-lime-900/60" },
] as const;
