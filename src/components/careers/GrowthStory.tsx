import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Building2, CalendarClock, Check, HandCoins, HeartHandshake, PiggyBank, Sparkles, TrendingUp, X,
} from "lucide-react";

/** MyEyeDr office footprint by year (approximate, publicly reported growth). */
const FOOTPRINT = [
  { year: "2018", offices: 250 },
  { year: "2019", offices: 320 },
  { year: "2020", offices: 480 },
  { year: "2021", offices: 620 },
  { year: "2022", offices: 780 },
  { year: "2023", offices: 930 },
  { year: "2024", offices: 1050 },
  { year: "2026", offices: 1200 },
];

const HIGHLIGHTS = [
  { icon: Building2, stat: "1,200+", label: "offices nationwide", sub: "From roughly 250 in 2018 — one of the fastest builds in eye care" },
  { icon: TrendingUp, stat: "~4.8x", label: "growth since 2018", sub: "Scale that creates real openings, real promotions, real mobility" },
  { icon: HeartHandshake, stat: "1 network", label: "shared support", sub: "Billing, insurance, marketing and hiring handled behind you" },
];

const COMPARE = [
  { alone: "Sell the practice yourself and hope for a buyer", with: "Transition your practice for real value, on your timeline" },
  { alone: "No employer 401(k) or retirement match", with: "Retirement plan with company support" },
  { alone: "Buy your own health coverage — family included", with: "Benefits for you and your family" },
  { alone: "Time off costs you revenue", with: "Paid time off that doesn't come out of your pocket" },
  { alone: "Carry billing, staffing, payroll and marketing alone", with: "A national team runs the business side" },
  { alone: "Retire abruptly when you're done", with: "Step back gradually — keep practicing as much as you want" },
];

function useCountUp(target: number, active: boolean, ms = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return n;
}

export default function GrowthStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [hoverYear, setHoverYear] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen(true)),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  const offices = useCountUp(1200, seen);
  const active = useMemo(
    () => FOOTPRINT.find((f) => f.year === hoverYear) ?? FOOTPRINT[FOOTPRINT.length - 1],
    [hoverYear],
  );

  return (
    <section ref={ref} aria-labelledby="growth-story" className="space-y-8">
      <div>
        <p className="micro-label text-primary">The MyEyeDr story</p>
        <h2 id="growth-story" className="mt-1 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          <span className="tabular-nums">{offices.toLocaleString()}+</span> offices, built in under a decade
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          In 2018 we were a few hundred offices. Today we're the largest independent-style optometry network in the
          country — and that growth is the reason careers here move faster than anywhere else in optical.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className="glass-panel hover-lift relative overflow-hidden rounded-2xl p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <h.icon className="h-4 w-4" />
            </div>
            <p className="font-display text-3xl font-bold leading-none text-foreground">{h.stat}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{h.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{h.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="micro-label text-muted-foreground">Office footprint</p>
            <p className="mt-1 font-semibold text-foreground">
              {active.year}: <span className="tabular-nums text-primary">{active.offices.toLocaleString()}</span> offices
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            <Sparkles className="h-3 w-3" /> Still opening offices every month
          </span>
        </div>
        <div className="mt-4 h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={FOOTPRINT}
              margin={{ left: -14, right: 8, top: 8 }}
              onMouseMove={(s) => setHoverYear((s?.activeLabel as string) ?? null)}
              onMouseLeave={() => setHoverYear(null)}
            >
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                  borderRadius: 12, fontSize: 12, color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v: number) => [`${v.toLocaleString()} offices`, "Footprint"]}
              />
              <Area
                type="monotone" dataKey="offices" stroke="hsl(var(--primary))" strokeWidth={2.5}
                fill="url(#growthFill)" dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }}
                animationDuration={1600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Footprint figures are approximate, based on publicly reported office counts, and shown to illustrate growth.
        </p>
      </div>

      <div>
        <p className="micro-label text-primary">For doctors and future owners</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          A different ending to an optometry career
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Independent practice usually ends the same way: find a buyer alone, absorb the risk, and walk away with
          whatever's left. Partnering with MyEyeDr changes that math — and everything before it.
        </p>

        <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className="glass-panel rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                <X className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Going it alone</p>
            </div>
            <ul className="space-y-2.5">
              {COMPARE.map((c) => (
                <li key={c.alone} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
                  {c.alone}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel hover-lift relative overflow-hidden rounded-2xl p-5 ring-1 ring-primary/25">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold uppercase tracking-wider text-primary">With MyEyeDr</p>
            </div>
            <ul className="relative space-y-2.5">
              {COMPARE.map((c) => (
                <li key={c.with} className="flex gap-2.5 text-sm font-medium leading-relaxed text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {c.with}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { icon: HandCoins, title: "Real value for what you built", body: "Transition your practice and property for what it's genuinely worth instead of a fire sale." },
            { icon: PiggyBank, title: "Benefits and retirement", body: "Health coverage for your family, paid time off and a retirement plan — as an owner-operator never gets." },
            { icon: CalendarClock, title: "Retire on a ramp", body: "Cut back gradually with a national team covering scheduling, staffing and operations behind you." },
          ].map((c) => (
            <div key={c.title} className="glass-panel hover-lift rounded-2xl p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <c.icon className="h-4 w-4" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">{c.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
