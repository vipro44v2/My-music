"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import { SlidersHorizontal, CloudRain, Waves, Flame, X } from "lucide-react";

type AmbienceKey = "rain" | "waves" | "fire";
type Levels = Record<AmbienceKey, number>;

const AMBIENCE_CONTROLS: {
  id: AmbienceKey;
  label: string;
  icon: ElementType;
  color: string;
}[] = [
  { id: "rain", label: "Rain", icon: CloudRain, color: "text-sky-300" },
  { id: "waves", label: "Waves", icon: Waves, color: "text-cyan-300" },
  { id: "fire", label: "Fire", icon: Flame, color: "text-amber-300" },
];

interface Voice {
  gain: GainNode;
  stop: () => void;
}

function createNoiseSource(ctx: AudioContext, filterType: BiquadFilterType, frequency: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;

  noise.connect(filter);
  return { source: noise, output: filter };
}

function createVoice(ctx: AudioContext, key: AmbienceKey): Voice {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  if (key === "waves") {
    const { source, output } = createNoiseSource(ctx, "lowpass", 520);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    output.connect(gain);
    source.start();
    lfo.start();
    return { gain, stop: () => { source.stop(); lfo.stop(); } };
  }

  if (key === "fire") {
    const { source, output } = createNoiseSource(ctx, "bandpass", 950);
    output.connect(gain);
    source.start();
    return { gain, stop: () => source.stop() };
  }

  const { source, output } = createNoiseSource(ctx, "highpass", 900);
  output.connect(gain);
  source.start();
  return { gain, stop: () => source.stop() };
}

export default function AmbienceMixer() {
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<Levels>({ rain: 0, waves: 0, fire: 0 });
  const audioRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<Partial<Record<AmbienceKey, Voice>>>({});

  useEffect(() => {
    const voices = voicesRef.current;
    const audio = audioRef.current;
    return () => {
      Object.values(voices).forEach((voice) => voice?.stop());
      audio?.close().catch(() => {});
    };
  }, []);

  const setLevel = async (key: AmbienceKey, value: number) => {
    const nextValue = Math.max(0, Math.min(100, value));
    setLevels((prev) => ({ ...prev, [key]: nextValue }));

    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      await audioRef.current.resume();
    }

    if (!voicesRef.current[key]) {
      voicesRef.current[key] = createVoice(audioRef.current, key);
    }

    const voice = voicesRef.current[key];
    if (voice) {
      voice.gain.gain.setTargetAtTime(nextValue / 160, audioRef.current.currentTime, 0.04);
    }
  };

  const activeCount = Object.values(levels).filter((value) => value > 0).length;

  return (
    <div className="fixed bottom-[190px] lg:bottom-[150px] right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="w-64 rounded-2xl border border-white/10 p-3 shadow-2xl shadow-black/60"
          style={{ background: "rgba(14,11,8,0.96)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center justify-between border-b border-white/8 pb-2 mb-3">
            <p className="text-white/80 text-sm font-semibold">Ambience</p>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            {AMBIENCE_CONTROLS.map(({ id, label, icon: Icon, color }) => (
              <label key={id} className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
                <span className="flex items-center gap-1.5 text-white/55 text-xs">
                  <Icon size={13} className={color} />
                  {label}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={levels[id]}
                  onChange={(e) => setLevel(id, Number(e.target.value))}
                  className="accent-teal-400"
                />
                <span className="text-white/30 text-[10px] tabular-nums text-right">{levels[id]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center hover:bg-teal-500/30 transition-all shadow-lg shadow-teal-900/20 relative"
        title="Ambience mixer"
      >
        <SlidersHorizontal size={19} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
