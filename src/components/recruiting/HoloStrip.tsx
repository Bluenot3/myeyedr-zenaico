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
            "linear-gradient(90deg, rgba(149,232,255,0.5) 0%, rgba(127,232,218,0.6) 24%, rgba(69,220,174,0.65) 48%, rgba(212,236,128,0.6) 72%, rgba(243,209,114,0.5) 100%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 5px, rgba(248,247,242,0.28) 5px 6px, transparent 6px 11px)" }}
      />
      <div
        className="absolute -inset-x-10 top-0 h-full w-1/3 animate-shimmer"
        style={{ background: "linear-gradient(90deg, transparent, rgba(248,247,242,0.7), transparent)", filter: "blur(4px)" }}
      />
    </div>
  );
}
