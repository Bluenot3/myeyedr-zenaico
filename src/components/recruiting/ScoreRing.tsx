import { scoreTone, TONE_HSL } from "@/lib/recruiting";

interface Props {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

/** Circular evaluation score dial with a luminous track. */
export default function ScoreRing({ score, size = 56, stroke = 5, label, className = "" }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const hsl = TONE_HSL[scoreTone(clamped)];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`hsl(${hsl})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 6px hsl(${hsl} / 0.5))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none" style={{ fontSize: size * 0.3, color: `hsl(${hsl})` }}>
          {clamped}
        </span>
        {label && <span className="text-[8px] micro-label text-muted-foreground mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
