import { type LucideIcon } from "lucide-react";
import { BadgeTone, TONE_HSL } from "@/lib/recruiting";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: BadgeTone;
  sub?: string;
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, tone = "emerald", sub, className = "" }: Props) {
  const hsl = TONE_HSL[tone];
  return (
    <div className={`glass-panel rounded-xl p-4 hover-lift relative overflow-hidden ${className}`}>
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl"
        style={{ background: `hsl(${hsl})` }}
      />
      <div className="flex items-center justify-between mb-3">
        <span className="micro-label text-muted-foreground">{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `hsl(${hsl} / 0.14)`, color: `hsl(${hsl})`, border: `1px solid hsl(${hsl} / 0.3)` }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold leading-none text-foreground">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
