import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, Eye, GraduationCap, HeartPulse, Microscope, Stethoscope, TrendingUp, UserCog, Users2,
} from "lucide-react";

/** U.S. Census Bureau projections for the 65+ population (millions) — the core driver of eye-care demand. */
const DEMAND = [
  { year: "2020", pop: 55.8 },
  { year: "2025", pop: 61.9 },
  { year: "2030", pop: 73.1 },
  { year: "2035", pop: 78.0 },
  { year: "2040", pop: 80.8 },
  { year: "2050", pop: 82.1 },
];

const HEADLINES = [
  {
    icon: TrendingUp,
    stat: "$65B+",
    label: "U.S. vision-care spend",
    sub: "Eyewear, exams and medical eye care — growing every year",
  },
  {
    icon: Eye,
    stat: "166M",
    label: "Americans wearing correction",
    sub: "Roughly 3 in 4 adults need glasses or contacts",
  },
  {
    icon: HeartPulse,
    stat: "82M",
    label: "Americans 65+ by 2050",
    sub: "Up from ~56M in 2020 — the age where eye care compounds",
  },
  {
    icon: Users2,
    stat: "Faster than average",
    label: "Ophthalmic tech job growth",
    sub: "Projected outlook for eye-care support roles (BLS)",
  },
];

const PATHS = [
  {
    icon: Stethoscope,
    title: "Patient-facing care",
    roles: ["Patient Service Coordinator", "Optometric Technician", "Pre-testing Technician"],
    body: "The front line of the exam experience — greeting, pre-testing, insurance and follow-up care.",
  },
  {
    icon: Eye,
    title: "Optical & dispensing",
    roles: ["Optician", "Lead Optician", "Optical Lab Technician"],
    body: "Frame styling, precise measurements, lens technology and edging work that patients feel every day.",
  },
  {
    icon: UserCog,
    title: "Office leadership",
    roles: ["Assistant Manager", "Office Manager", "Multi-site Manager"],
    body: "Own the schedule, the numbers and the team culture of a full office — with a real path to regional.",
  },
  {
    icon: Microscope,
    title: "Clinical partnership",
    roles: ["Doctor support", "Medical records", "Specialty testing"],
    body: "Work alongside optometrists on medical eye care, diagnostics and continuity of patient care.",
  },
];

const LADDER = [
  "Patient Service Coordinator",
  "Optician (ABO support)",
  "Lead Optician",
  "Office Manager",
  "Multi-site / Regional",
];

export default function IndustryGrowth() {
  return (
    <section aria-labelledby="industry-growth" className="space-y-8">
      <div>
        <p className="micro-label text-primary">Why optical, why now</p>
        <h2 id="industry-growth" className="mt-1 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          A career in one of healthcare's most durable markets
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Vision and eye health aren't discretionary — they scale with an aging population, screen time and
          medical eye disease. MyEyeDr grows with it, which is why our offices promote from within instead of
          hiring over you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {HEADLINES.map((h) => (
          <div key={h.label} className="glass-panel hover-lift relative overflow-hidden rounded-2xl p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <h.icon className="h-4 w-4" />
            </div>
            <p className="font-display text-2xl font-bold leading-none text-foreground sm:text-3xl">{h.stat}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{h.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{h.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="micro-label text-muted-foreground">Demand curve</p>
              <p className="mt-1 font-semibold text-foreground">Americans aged 65+ (millions)</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              <ArrowUpRight className="h-3 w-3" /> +47% by 2050
            </span>
          </div>
          <div className="mt-4 h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMAND} margin={{ left: -18, right: 8, top: 6 }}>
                <defs>
                  <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
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
                  formatter={(v: number) => [`${v}M people`, "Aged 65+"]}
                />
                <Area
                  type="monotone" dataKey="pop" stroke="hsl(var(--primary))" strokeWidth={2.5}
                  fill="url(#demandFill)" dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Source: U.S. Census Bureau population projections. Market and prevalence figures are industry estimates,
            shown for context only.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
            <GraduationCap className="h-4 w-4" />
          </div>
          <p className="font-display text-xl font-bold text-foreground">Grow without leaving</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Most of our managers started at the front desk or the optical board. This is the path we actually
            promote along.
          </p>
          <ol className="mt-5 space-y-3">
            {LADDER.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 font-mono text-[11px] font-bold text-primary ring-1 ring-primary/25">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <p className="micro-label text-primary">Variety of opportunity</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Four very different ways to build here
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {PATHS.map((p) => (
            <div key={p.title} className="glass-panel hover-lift rounded-2xl p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <p.icon className="h-4 w-4" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.roles.map((r) => (
                  <li key={r} className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-foreground">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
