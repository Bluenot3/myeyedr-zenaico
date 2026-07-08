import { useMemo } from "react";
import {
  TrendingUp, Clock, Filter, Sparkles, Quote, Activity, Target, Award, MessageSquareQuote,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import { useCandidates, usePositions, useInterviewEvents, useAllCandidateMedia, Candidate } from "@/hooks/useRecruiting";
import { STAGES } from "@/lib/recruiting";

const STOP = new Set(("a an the and or but if then so of to in on at for with from by as is are was were be been being this that these those i we you they he she it my our your their his her its me us them will would can could should may might just really very much more most also able want need work working job role team people time day days week weeks got get like know think feel feels felt make made really always never able there here what which who whom where when why how not no yes into out up down over under again about because been being having have has had do does did doing").split(" "));

const PALETTE = ["214 100% 62%", "190 100% 66%", "160 84% 46%", "42 100% 58%", "216 100% 66%", "280 70% 66%"];

function StatTile({ label, value, sub, hsl, Icon }: { label: string; value: string | number; sub?: string; hsl: string; Icon: typeof Clock }) {
  return (
    <div className="glass-panel rounded-xl p-4 relative overflow-hidden">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-20 blur-2xl" style={{ background: `hsl(${hsl})` }} />
      <div className="flex items-center justify-between mb-2">
        <span className="micro-label text-muted-foreground text-[10px]">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `hsl(${hsl}/0.14)`, color: `hsl(${hsl})`, border: `1px solid hsl(${hsl}/0.3)` }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold leading-none text-foreground">{value}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, hint, children }: { title: string; icon: typeof Clock; hint?: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-emerald" />
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {hint && <span className="ml-auto text-[9px] font-mono uppercase tracking-wide text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Insights() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: events = [] } = useInterviewEvents();
  const { data: media = [] } = useAllCandidateMedia();

  // Hire date lookup from scheduled hire events (fallback to updated_at)
  const hireDate = (c: Candidate): number => {
    const hireEv = events.find((e) => e.candidate_id === c.id && e.event_type === "hire");
    return new Date(hireEv?.starts_at || c.updated_at).getTime();
  };

  const hired = useMemo(() => candidates.filter((c) => c.stage === "hired"), [candidates]);

  const timeToHire = useMemo(() => {
    const days = hired
      .map((c) => (hireDate(c) - new Date(c.created_at).getTime()) / 86400000)
      .filter((d) => d >= 0 && d < 400);
    if (!days.length) return { avg: 0, fastest: 0, series: [] as { label: string; days: number }[] };
    const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    const fastest = Math.round(Math.min(...days));
    // trend: avg per hire month
    const byMonth = new Map<string, number[]>();
    hired.forEach((c) => {
      const d = (hireDate(c) - new Date(c.created_at).getTime()) / 86400000;
      if (d < 0 || d >= 400) return;
      const key = new Date(hireDate(c)).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      byMonth.set(key, [...(byMonth.get(key) || []), d]);
    });
    const series = Array.from(byMonth.entries()).map(([label, arr]) => ({ label, days: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }));
    return { avg, fastest, series };
  }, [hired, events]);

  const funnel = useMemo(() => {
    return STAGES.map((s, i) => ({
      label: s.label,
      count: candidates.filter((c) => c.stage === s.key).length + (s.key === "applied" ? 0 : 0),
      hsl: PALETTE[i % PALETTE.length],
    }));
  }, [candidates]);
  const totalApplied = candidates.length;
  const hireRate = totalApplied ? Math.round((hired.length / totalApplied) * 100) : 0;

  const sources = useMemo(() => {
    const map = new Map<string, { total: number; hires: number }>();
    candidates.forEach((c) => {
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
  }, [candidates]);
  const bestSource = useMemo(() => [...sources].filter((s) => s.hires > 0).sort((a, b) => b.rate - a.rate)[0], [sources]);

  const volume = useMemo(() => {
    const map = new Map<string, number>();
    candidates.forEach((c) => {
      const key = new Date(c.created_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count })).slice(-8);
  }, [candidates]);

  // Standout language — from soundbites of hired / top-rated candidates
  const topIds = useMemo(() => new Set(candidates.filter((c) => c.stage === "hired" || c.rating >= 4).map((c) => c.id)), [candidates]);
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
    const phrases = Array.from(wordCounts.entries()).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 14);
    const labels = Array.from(labelCounts.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    return { phrases, labels, bites, candidates: new Set(topMedia.map((m) => m.candidate_id)).size };
  }, [media, topIds]);

  const openSeats = positions.filter((p) => p.status === "open").reduce((n, p) => n + p.openings, 0);

  return (
    <div className="space-y-5 animate-rise">
      <div>
        <h2 className="font-display text-2xl font-bold">Metrics & Insights</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Trends across your whole process — the things no one has time to measure. Team-wide, live.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Avg time to hire" value={timeToHire.avg ? `${timeToHire.avg}d` : "—"} sub={timeToHire.fastest ? `fastest ${timeToHire.fastest}d` : "no hires yet"} hsl="214 100% 62%" Icon={Clock} />
        <StatTile label="Applied → hired" value={`${hireRate}%`} sub={`${hired.length} of ${totalApplied}`} hsl="160 84% 46%" Icon={Target} />
        <StatTile label="Open seats" value={openSeats} sub="to fill" hsl="42 100% 58%" Icon={Award} />
        <StatTile label="Best source" value={bestSource?.source || "—"} sub={bestSource ? `${bestSource.rate}% hire rate` : "n/a"} hsl="190 100% 66%" Icon={Sparkles} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pipeline funnel" icon={Filter} hint="current stage">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={78} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {funnel.map((f, i) => <Cell key={i} fill={`hsl(${f.hsl})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Time to hire trend" icon={TrendingUp} hint="days by month">
          {timeToHire.series.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeToHire.series} margin={{ left: -18, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="days" stroke="hsl(214 100% 62%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="Hire a few candidates to see time-to-hire trends." />}
        </ChartCard>

        <ChartCard title="Source effectiveness" icon={Activity} hint="applicants vs hires">
          {sources.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sources} margin={{ left: -18, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="source" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" name="Applicants" fill="hsl(190 100% 66%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hires" name="Hires" fill="hsl(160 84% 46%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="No candidate sources yet." />}
        </ChartCard>

        <ChartCard title="Application volume" icon={TrendingUp} hint="per month">
          {volume.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volume} margin={{ left: -18, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(42 100% 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="No applications yet." />}
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
                  <span key={word} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs bg-emerald/10 text-emerald border border-emerald/25"
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
                    <div key={l.label} className="rounded-lg bg-background/40 border border-border/60 p-2.5 flex items-center justify-between">
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
