import { Check, Shield, Zap, TrendingUp } from "lucide-react";
import { TONE_HSL, type BadgeTone } from "@/lib/recruiting";
import type { MatchResult, MatchBadge, ScoreFactor, VerificationItem } from "@/lib/matchScore";

/* -------- Badge chip -------- */
export function MatchBadgeChip({ badge }: { badge: MatchBadge }) {
  const hsl = TONE_HSL[badge.tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide whitespace-nowrap"
      style={{ color: `hsl(${hsl})`, background: `hsl(${hsl} / 0.12)`, border: `1px solid hsl(${hsl} / 0.32)` }}
    >
      {badge.kind === "risk" ? "▲" : badge.kind === "strength" ? "◆" : "●"} {badge.label}
    </span>
  );
}

/* -------- Horizontal meter -------- */
export function MeterBar({ value, hsl, height = 6 }: { value: number; hsl: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-secondary/60 overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(2, value)}%`, background: `hsl(${hsl})`, boxShadow: `0 0 8px hsl(${hsl} / 0.5)` }}
      />
    </div>
  );
}

/* -------- Score factor breakdown -------- */
export function FactorBreakdown({ factors }: { factors: ScoreFactor[] }) {
  return (
    <div className="space-y-2.5">
      {factors.map((f) => {
        const hsl = f.score >= 80 ? "152 62% 50%" : f.score >= 60 ? "43 85% 66%" : f.score >= 45 ? "28 86% 63%" : "4 73% 60%";
        return (
          <div key={f.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-foreground/90">
                {f.label} <span className="text-muted-foreground">· {Math.round(f.weight * 100)}%</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: `hsl(${hsl})` }}>{f.score}</span>
            </div>
            <MeterBar value={f.score} hsl={hsl} />
            <p className="text-[9px] text-muted-foreground mt-0.5">{f.note}</p>
          </div>
        );
      })}
    </div>
  );
}

/* -------- Availability gauge -------- */
export function AvailabilityGauge({ m }: { m: MatchResult }) {
  const a = m.availability;
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `hsl(${a.hsl} / 0.3)`, background: `hsl(${a.hsl} / 0.07)` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Availability</span>
        <span className="text-[11px] font-bold" style={{ color: `hsl(${a.hsl})` }}>{a.fit}</span>
      </div>
      <MeterBar value={a.fit} hsl={a.hsl} />
      <p className="text-[10px] mt-1.5" style={{ color: `hsl(${a.hsl})` }}>{a.label}</p>
      {a.cap != null && <p className="text-[9px] text-muted-foreground mt-0.5">Caps overall match at {a.cap}</p>}
    </div>
  );
}

/* -------- Risk + readiness stat pills -------- */
export function RiskReadiness({ m }: { m: MatchResult }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <MiniStat icon={Shield} label="Risk" value={m.risk.label} hsl={m.risk.hsl} />
      <MiniStat icon={TrendingUp} label="Readiness" value={`${m.readiness}%`} hsl="161 66% 57%" bar={m.readiness} />
      <MiniStat icon={Zap} label="Power" value={`Lv ${m.powerLevel}`} hsl="43 85% 66%" bar={m.powerLevel * 10} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hsl, bar }: { icon: typeof Shield; label: string; value: string; hsl: string; bar?: number }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/60 p-2">
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" style={{ color: `hsl(${hsl})` }} />
        <span className="text-[8px] font-mono uppercase text-muted-foreground">{label}</span>
      </div>
      <p className="text-[11px] font-bold leading-none mb-1" style={{ color: `hsl(${hsl})` }}>{value}</p>
      {bar != null && <MeterBar value={bar} hsl={hsl} height={3} />}
    </div>
  );
}

/* -------- Verification checklist -------- */
export function VerificationChecklist({ items, done, total }: { items: VerificationItem[]; done: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Verification</span>
        <span className="text-[11px] font-bold text-emerald">{done}/{total}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full shrink-0"
              style={{
                background: it.done ? "hsl(152 62% 50% / 0.15)" : "hsl(180 10% 40% / 0.15)",
                border: `1px solid ${it.done ? "hsl(152 62% 50% / 0.4)" : "hsl(180 10% 50% / 0.3)"}`,
              }}
            >
              {it.done && <Check className="h-2.5 w-2.5 text-emerald" />}
            </span>
            <span className={it.done ? "text-foreground/90" : "text-muted-foreground"}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const toneHsl = (t: BadgeTone) => TONE_HSL[t];
