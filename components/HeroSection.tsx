import { Play } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="flex-shrink-0 flex items-center px-5 lg:px-10 py-6 lg:py-8">
      <div className="max-w-md">
        <h1 className="text-[1.9rem] sm:text-[2.2rem] lg:text-[2.6rem] font-bold text-white leading-[1.18] mb-3 lg:mb-4 drop-shadow-lg">
          Chill with
          <br />
          gentle melodies{" "}
          <span className="inline-block animate-pulse">✨</span>
        </h1>
        <p className="text-white/65 text-[13px] lg:text-[14px] leading-relaxed mb-5 lg:mb-7 drop-shadow">
          Relax, study, or drift into sleep
          <br className="hidden sm:block" />
          {" "}with music and the world of Gibli.
        </p>
        <button className="flex items-center gap-2.5 glass-input border border-white/25 text-white px-6 lg:px-7 py-2.5 lg:py-3 rounded-full text-sm font-semibold hover:bg-white/18 hover:border-white/40 transition-all duration-200 shadow-lg">
          <Play size={14} fill="white" />
          Listen now
        </button>
      </div>
    </section>
  );
}
