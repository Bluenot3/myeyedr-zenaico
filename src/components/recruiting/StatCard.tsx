import { type LucideIcon } from "lucide-react";
import { BadgeTone, TONE_HSL } from "@/lib/recruiting";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: BadgeTone;
  sub?: string;
  className?: string;
  /** Denser tile for high-density grids */
  compact?: boolean;
}

export default function StatCard({ label, value, icon: Icon, tone = "emerald", sub, className = "", compact = false }: Props) {
  const hsl = TONE_HSL[tone];
  return (
    <div
      className={`glass-panel hover-lift relative overflow-hidden ${compact ? "rounded-xl p-3" : "rounded-xl p-4"} ${className}`}
    >
      <div
        className={`absolute -right-6 -top-6 rounded-full blur-2xl ${compact ? "h-16 w-16 opacity-[0.14]" : "h-20 w-20 opacity-20"}`}
        style={{ background: `hsl(${hsl})` }}
      />
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <span className={`micro-label text-muted-foreground ${compact ? "text-[8.5px] truncate pr-1" : ""}`}>{label}</span>
        <div
          className={`flex items-center justify-center shrink-0 ${compact ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg"}`}
          style={{ background: `hsl(${hsl} / 0.14)`, color: `hsl(${hsl})`, border: `1px solid hsl(${hsl} / 0.3)` }}
        >
          <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </div>
      </div>
      <p className={`font-display nums font-bold leading-none text-foreground ${compact ? "text-2xl" : "text-3xl"}`}>{value}</p>
      {sub && <p className={`text-muted-foreground ${compact ? "mt-1 text-[10px] truncate" : "mt-1.5 text-[11px]"}`}>{sub}</p>}
    </div>
  );
}
