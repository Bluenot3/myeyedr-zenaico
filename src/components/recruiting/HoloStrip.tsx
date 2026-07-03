interface Props {
  className?: string;
  height?: number;
}

/** Horizontal holographic security ribbon — color-shifting foil accent. */
export default function HoloStrip({ className = "", height = 3 }: Props) {
  return (
    <div className={`pointer-events-none relative overflow-hidden rounded-full ${className}`} style={{ height }} aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(159,228,255,0.55) 0%, rgba(92,196,255,0.65) 24%, rgba(46,139,255,0.7) 48%, rgba(111,184,255,0.65) 72%, rgba(191,234,255,0.55) 100%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 5px, rgba(255,255,255,0.28) 5px 6px, transparent 6px 11px)" }}
      />
      <div
        className="absolute -inset-x-10 top-0 h-full w-1/3 animate-shimmer"
        style={{ background: "linear-gradient(90deg, transparent, rgba(248,247,242,0.7), transparent)", filter: "blur(4px)" }}
      />
    </div>
  );
}
