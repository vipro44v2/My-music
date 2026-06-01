import type { CSSProperties } from "react";

export function isVideoSrc(src: string) {
  const cleanSrc = src.split("#")[0].split("?")[0].toLowerCase();
  return cleanSrc.endsWith(".mp4") || src.includes("media=video");
}

export default function MoodMedia({
  src,
  alt = "",
  className = "absolute inset-0 w-full h-full object-cover",
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (isVideoSrc(src)) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        controls={false}
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.muted = true;
          e.currentTarget.play().catch(() => {});
        }}
        style={{ pointerEvents: "none", ...style }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
