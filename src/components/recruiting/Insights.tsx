import { useMemo, useState } from "react";
import {
  TrendingUp, Clock, Filter, Sparkles, Quote, Activity, Target, Award,
  MessageSquareQuote, Users, Gauge, Star, MapPin, ArrowRight, Zap, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line,
  CartesianGrid, Cell, AreaChart, Area, ComposedChart, RadialBarChart, RadialBar,
  PolarAngleAxis, Radar, RadarChart, PolarGrid, PolarRadiusAxis, Legend,
} from "recharts";
import { useCandidates, usePositions, useInterviewEvents, useAllCandidateMedia, useLocations, Candidate } from "@/hooks/useRecruiting";
import { STAGES } from "@/lib/recruiting";

const STOP = new Set(("a an the and or but if then so of to in on at for with from by as is are was were be been being this that these those i we you they he she it my our your their his her its me us them will would can could should may might just really very much more most also able want need work working job role team people time day days week weeks got get like know think feel feels felt make made really always never able there here what which who whom where when why how not no yes into out up down over under again about because been being having have has had do does did doing").split(" "));

const PALETTE = ["214 100% 62%", "190 100% 66%", "160 84% 46%", "42 100% 58%", "216 100% 66%", "280 70% 66%", "330 80% 66%"];

type Range = "30" | "90" | "365" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "30", label: "30D" },
  { key: "90", label: "90D" },
  { key: "365", label: "1Y" },
  { key: "all", label: "All" },
];

/* ---------------- small UI atoms ---------------- */
function StatTile({ label, value, sub, hsl, Icon, trend }: { label: string; value: string | number; sub?: string; hsl: string; Icon: typeof Clock; trend?: number }) {
  return (
    <div className="glass-panel rounded-xl p-4 relative overflow-hidden hover-lift group">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: `hsl(${hsl})` }} />
      <div className="flex items-center justify-between mb-2">
        <span className="micro-label text-muted-foreground text-[10px]">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110" style={{ background: `hsl(${hsl}/0.14)`, color: `hsl(${hsl})`, border: `1px solid hsl(${hsl}/0.3)` }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold leading-none text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {typeof trend === "number" && trend !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${trend > 0 ? "text-emerald" : "text-rose-400"}`}>
            {trend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}{Math.abs(trend)}%
          </span>
        )}
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, hint, children, className = "" }: { title: string; icon: typeof Clock; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-emerald" />
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {hint && <span className="ml-auto text-[9px] font-mono uppercase tracking-wide text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 8px 30px -8px hsl(var(--emerald)/0.25)" } as const;

export default function Insights() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: events = [] } = useInterviewEvents();
  const { data: media = [] } = useAllCandidateMedia();
  const { data: locations = [] } = useLocations();

  const [range, setRange] = useState<Range>("all");
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const cutoff = useMemo(() => (range === "all" ? 0 : Date.now() - Number(range) * 86400000), [range]);
  const inRange = (iso: string) => (cutoff === 0 ? true : new Date(iso).getTime() >= cutoff);

  // Range-filtered candidate set (guard against bad dates)
  const scoped = useMemo(() => candidates.filter((c) => c?.created_at && inRange(c.created_at)), [candidates, cutoff]);
  // Previous equal-length window for trend deltas
  const prevScoped = useMemo(() => {
    if (range === "all") return [];
    const span = Number(range) * 86400000;
    const lo = Date.now() - span * 2, hi = Date.now() - span;
    return candidates.filter((c) => { const t = new Date(c.created_at).getTime(); return t >= lo && t < hi; });
  }, [candidates, range]);

  const hireDate = (c: Candidate): number => {
    const hireEv = events.find((e) => e.candidate_id === c.id && e.event_type === "hire");
    return new Date(hireEv?.starts_at || c.updated_at).getTime();
  };

  const hired = useMemo(() => scoped.filter((c) => c.stage === "hired"), [scoped]);
  const prevHired = useMemo(() => prevScoped.filter((c) => c.stage === "hired"), [prevScoped]);

  const timeToHire = useMemo(() => {
    const days = hired.map((c) => (hireDate(c) - new Date(c.created_at).getTime()) / 86400000).filter((d) => d >= 0 && d < 400);
    if (!days.length) return { avg: 0, fastest: 0, median: 0, series: [] as { label: string; days: number }[] };
    const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    const fastest = Math.round(Math.min(...days));
    const sorted = [...days].sort((a, b) => a - b);
    const median = Math.round(sorted[Math.floor(sorted.length / 2)]);
    const byMonth = new Map<string, number[]>();
    hired.forEach((c) => {
      const d = (hireDate(c) - new Date(c.created_at).getTime()) / 86400000;
      if (d < 0 || d >= 400) return;
      const key = new Date(hireDate(c)).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      byMonth.set(key, [...(byMonth.get(key) || []), d]);
    });
    const series = Array.from(byMonth.entries()).map(([label, arr]) => ({ label, days: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }));
    return { avg, fastest, median, series };
  }, [hired, events]);

  // Cumulative funnel + step conversion
  const funnel = useMemo(() => {
    const idxOf = (k: string) => STAGES.findIndex((s) => s.key === k);
    return STAGES.map((s, i) => {
      // count everyone who reached at least this stage (excluding terminal reject/withdraw whose furthest stage < i)
      const reached = scoped.filter((c) => {
        if (c.stage === "hired") return true;
        if (c.stage === "rejected" || c.stage === "withdrawn") return false;
        return idxOf(c.stage) >= i;
      }).length;
      return { label: s.label, key: s.key, count: reached, hsl: PALETTE[i % PALETTE.length] };
    });
  }, [scoped]);

  const conversion = useMemo(() => funnel.slice(1).map((f, i) => {
    const prev = funnel[i].count || 0;
    return { label: `${STAGES[i].short}→${STAGES[i + 1].short}`, rate: prev ? Math.round((f.count / prev) * 100) : 0, hsl: f.hsl };
  }), [funnel]);

  const totalApplied = scoped.length;
  const hireRate = totalApplied ? Math.round((hired.length / totalApplied) * 100) : 0;
  const prevHireRate = prevScoped.length ? Math.round((prevHired.length / prevScoped.length) * 100) : 0;
  const volumeTrend = prevScoped.length ? Math.round(((scoped.length - prevScoped.length) / prevScoped.length) * 100) : 0;

  const activeCount = useMemo(() => scoped.filter((c) => !["hired", "rejected", "withdrawn"].includes(c.stage)).length, [scoped]);
  const avgScore = useMemo(() => {
    const vals = scoped.map((c) => c.score).filter((n) => typeof n === "number" && n > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [scoped]);

  const sources = useMemo(() => {
    const map = new Map<string, { total: number; hires: number }>();
    scoped.forEach((c) => {
      const key = c.source || "Unknown";
      const e = map.get(key) || { total: 0, hires: 0 };
      e.total++;
      if (c.stage === "hired") e.hires++;
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([source, v]) => ({ source, ...v, rate: v.total ? Math.round((v.hires / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [scoped]);
  const bestSource = useMemo(() => [...sources].filter((s) => s.hires > 0).sort((a, b) => b.rate - a.rate)[0], [sources]);

  const volume = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((c) => {
      const key = new Date(c.created_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count })).slice(-9);
  }, [scoped]);

  // Rating distribution 1..5
  const ratings = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5].map((r) => ({ label: `${r}★`, count: scoped.filter((c) => Math.round(c.rating || 0) === r).length, hsl: PALETTE[r % PALETTE.length] }));
    return buckets;
  }, [scoped]);

  // Location performance (top 6 by applicants)
  const locPerf = useMemo(() => {
    const nameOf = (id: string | null) => locations.find((l) => l.id === id)?.site_name || "Unassigned";
    const map = new Map<string, { total: number; hires: number; active: number }>();
    scoped.forEach((c) => {
      const key = nameOf(c.location_id);
      const e = map.get(key) || { total: 0, hires: 0, active: 0 };
      e.total++;
      if (c.stage === "hired") e.hires++;
      if (!["hired", "rejected", "withdrawn"].includes(c.stage)) e.active++;
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([location, v]) => ({ location, ...v, fill: v.total ? Math.round((v.hires / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [scoped, locations]);

  // Standout language — from soundbites of hired / top-rated candidates
  const topIds = useMemo(() => new Set(scoped.filter((c) => c.stage === "hired" || c.rating >= 4).map((c) => c.id)), [scoped]);
  const standout = useMemo(() => {
    const topMedia = media.filter((m) => topIds.has(m.candidate_id));
    const labelCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();
    let bites = 0;
    topMedia.forEach((m) => {
      (m.soundbites || []).forEach((s) => {
        bites++;
        labelCounts.set(s.label, (labelCounts.get(s.label) || 0) + 1);
        (s.quote || "").toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).forEach((w) => {
          if (w.length < 4 || STOP.has(w)) return;
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        });
      });
    });
    const phrases = Array.from(wordCounts.entries()).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 16);
    const labels = Array.from(labelCounts.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    return { phrases, labels, bites, candidates: new Set(topMedia.map((m) => m.candidate_id)).size };
  }, [media, topIds]);

  const openSeats = positions.filter((p) => p.status === "open").reduce((n, p) => n + (p.openings || 0), 0);

  // Overall conversion for radial gauge
  const gaugeData = [{ name: "rate", value: hireRate, fill: "hsl(160 84% 46%)" }];

  const stageDetail = activeStage != null ? funnel[activeStage] : null;
  const stageDrop = activeStage != null && activeStage > 0 ? (funnel[activeStage - 1].count ? Math.round((funnel[activeStage].count / funnel[activeStage - 1].count) * 100) : 0) : null;

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Metrics & Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Executive analytics across your entire hiring engine — live, team-wide, and interactive.</p>
        </div>
        <div className="inline-flex items-center rounded-xl glass-panel p-1 gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${range === r.key ? "bg-emerald/15 text-emerald border border-emerald/35 shadow-[0_0_16px_-8px_hsl(var(--emerald)/0.7)]" : "text-muted-foreground hover:text-foreground border border-transparent"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile label="Avg time to hire" value={timeToHire.avg ? `${timeToHire.avg}d` : "—"} sub={timeToHire.median ? `median ${timeToHire.median}d` : "no hires yet"} hsl="214 100% 62%" Icon={Clock} />
        <StatTile label="Applied → hired" value={`${hireRate}%`} sub={`${hired.length} of ${totalApplied}`} hsl="160 84% 46%" Icon={Target} trend={range === "all" ? undefined : hireRate - prevHireRate} />
        <StatTile label="Active pipeline" value={activeCount} sub="in progress" hsl="216 100% 66%" Icon={Users} />
        <StatTile label="Avg match score" value={avgScore ? `${avgScore}` : "—"} sub="across scoped" hsl="280 70% 66%" Icon={Gauge} />
        <StatTile label="Open seats" value={openSeats} sub="to fill" hsl="42 100% 58%" Icon={Award} />
        <StatTile label="Best source" value={bestSource?.source || "—"} sub={bestSource ? `${bestSource.rate}% hire rate` : "n/a"} hsl="190 100% 66%" Icon={Sparkles} />
      </div>

      {/* Funnel + conversion gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Pipeline funnel" icon={Filter} hint="tap a stage" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 20 }}>
              <defs>
                {funnel.map((f, i) => (
                  <linearGradient key={i} id={`fn${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={`hsl(${f.hsl})`} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={`hsl(${f.hsl})`} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(_, i) => setActiveStage(activeStage === i ? null : i)} className="cursor-pointer">
                {funnel.map((f, i) => (
                  <Cell key={i} fill={`url(#fn${i})`} opacity={activeStage == null || activeStage === i ? 1 : 0.35} stroke={activeStage === i ? `hsl(${f.hsl})` : "transparent"} strokeWidth={2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {stageDetail && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-background/40 border border-border/60 px-3 py-2 text-[11px] animate-rise">
              <Zap className="h-3.5 w-3.5 text-emerald" />
              <span className="font-semibold text-foreground">{stageDetail.count}</span>
              <span className="text-muted-foreground">reached {stageDetail.label}</span>
              {stageDrop != null && (
                <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                  <ArrowRight className="h-3 w-3" /> {stageDrop}% carried from prior stage
                </span>
              )}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Overall conversion" icon={Target} hint="applied → hired">
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <RadialBarChart data={gaugeData} innerRadius="72%" outerRadius="100%" startAngle={220} endAngle={-40}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "hsl(var(--muted)/0.35)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display text-4xl font-bold text-emerald">{hireRate}%</span>
              <span className="text-[10px] text-muted-foreground mt-1">{hired.length} hired</span>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stage conversion rates" icon={Activity} hint="% carried forward">
          {conversion.some((c) => c.rate > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={conversion} margin={{ left: -18, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={44} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Carried"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {conversion.map((c, i) => <Cell key={i} fill={`hsl(${c.hsl})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Move candidates through stages to see conversion rates." />}
        </ChartCard>

        <ChartCard title="Time to hire trend" icon={TrendingUp} hint="days by month">
          {timeToHire.series.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeToHire.series} margin={{ left: -18, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="tth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(214 100% 62%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(214 100% 62%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}d`, "Avg"]} />
                <Area type="monotone" dataKey="days" stroke="hsl(214 100% 62%)" strokeWidth={2.5} fill="url(#tth)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Hire a few candidates to see time-to-hire trends." />}
        </ChartCard>

        <ChartCard title="Source effectiveness" icon={Activity} hint="volume + hire rate">
          {sources.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={sources} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="source" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
                <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="l" dataKey="total" name="Applicants" fill="hsl(190 100% 66%)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" dataKey="hires" name="Hires" fill="hsl(160 84% 46%)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="rate" name="Hire %" stroke="hsl(42 100% 58%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="No candidate sources yet." />}
        </ChartCard>

        <ChartCard title="Application volume" icon={TrendingUp} hint="per month">
          {volume.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volume} margin={{ left: -18, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(42 100% 58%)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(42 100% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(42 100% 58%)" strokeWidth={2.5} fill="url(#vol)" dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="No applications yet." />}
        </ChartCard>

        <ChartCard title="Candidate quality" icon={Star} hint="rating distribution">
          {ratings.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratings} margin={{ left: -18, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ratings.map((r, i) => <Cell key={i} fill={`hsl(${r.hsl})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Rate candidates to see the quality distribution." />}
        </ChartCard>

        <ChartCard title="Location performance" icon={MapPin} hint="hire rate by site">
          {locPerf.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={locPerf} outerRadius="72%">
                <PolarGrid stroke="hsl(var(--border)/0.6)" />
                <PolarAngleAxis dataKey="location" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                <Radar name="Applicants" dataKey="total" stroke="hsl(190 100% 66%)" fill="hsl(190 100% 66%)" fillOpacity={0.25} />
                <Radar name="Hire %" dataKey="fill" stroke="hsl(160 84% 46%)" fill="hsl(160 84% 46%)" fillOpacity={0.2} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Assign candidates to locations to compare site performance." />}
        </ChartCard>
      </div>

      {/* Standout language */}
      <ChartCard title="What standout candidates say" icon={MessageSquareQuote} hint={`${standout.candidates} top candidates`}>
        {standout.bites === 0 ? (
          <EmptyChart text="Add interview recordings to your best candidates — patterns in what they say will surface here." />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">Words your best candidates use most</p>
              <div className="flex flex-wrap gap-2">
                {standout.phrases.map(([word, n]) => (
                  <span key={word} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs bg-emerald/10 text-emerald border border-emerald/25 transition-transform hover:scale-105"
                    style={{ fontSize: `${Math.min(15, 11 + n)}px` }}>
                    <Quote className="h-3 w-3 opacity-60" />{word}<span className="text-[9px] text-muted-foreground">×{n}</span>
                  </span>
                ))}
              </div>
            </div>
            {standout.labels.length > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-2">What made them stand out</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {standout.labels.map((l) => (
                    <div key={l.label} className="rounded-lg bg-background/40 border border-border/60 p-2.5 flex items-center justify-between hover-lift">
                      <span className="text-[11px] capitalize text-foreground">{l.label.replace("_", " ")}</span>
                      <span className="font-display text-sm font-bold text-emerald">{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-[200px] text-center text-[11px] text-muted-foreground px-6">{text}</div>;
}
