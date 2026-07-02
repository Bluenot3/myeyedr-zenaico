import { useMemo } from "react";

interface Props {
  size?: number;
  className?: string;
  spin?: boolean;
}

/** Ornamental credential seal — treasury-style rosette medallion (abstract). */
export default function Medallion({ size = 40, className = "", spin = false }: Props) {
  const c = size / 2;
  const teeth = useMemo(() => {
    const n = 48;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const inner = size * 0.33;
      const outer = size * 0.4;
      return {
        x1: +(c + Math.cos(a) * inner).toFixed(2),
        y1: +(c + Math.sin(a) * inner).toFixed(2),
        x2: +(c + Math.cos(a) * outer).toFixed(2),
        y2: +(c + Math.sin(a) * outer).toFixed(2),
      };
    });
  }, [size, c]);

  return (
    <svg
      className={`${className} ${spin ? "animate-spin-slow" : ""}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="med-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6964f" />
          <stop offset="0.5" stopColor="#f3d172" />
          <stop offset="1" stopColor="#fcf6e6" />
        </linearGradient>
        <linearGradient id="med-em" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#45dcae" />
          <stop offset="1" stopColor="#d4ec80" />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={size * 0.44} stroke="url(#med-gold)" strokeWidth="1" opacity="0.7" />
      <circle cx={c} cy={c} r={size * 0.41} stroke="url(#med-gold)" strokeWidth="0.5" opacity="0.4" />
      {teeth.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="url(#med-gold)" strokeWidth="0.7" opacity="0.5" />
      ))}
      <circle cx={c} cy={c} r={size * 0.28} stroke="url(#med-em)" strokeWidth="0.8" opacity="0.7" />
      {/* center eye glyph — nods to eyecare */}
      <path
        d={`M${c - size * 0.13} ${c} Q${c} ${c - size * 0.11} ${c + size * 0.13} ${c} Q${c} ${c + size * 0.11} ${c - size * 0.13} ${c} Z`}
        stroke="url(#med-em)"
        strokeWidth={size * 0.016}
        fill="none"
      />
      <circle cx={c} cy={c} r={size * 0.045} fill="url(#med-em)" />
    </svg>
  );
}
