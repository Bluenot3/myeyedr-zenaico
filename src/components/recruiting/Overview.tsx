import { useMemo, useState } from "react";
import { Users, Briefcase, Award, Sparkles, TrendingUp, Flame, Activity, ArrowRight } from "lucide-react";
import { useCandidates, usePositions, useLocations, Candidate } from "@/hooks/useRecruiting";
import { STAGES, stageMeta, relativeTime, initials, REGIONS } from "@/lib/recruiting";
import StatCard from "./StatCard";
import CandidateProfile from "./CandidateProfile";
import StageBadge from "./StageBadge";
import HoloStrip from "./HoloStrip";
import { EyeMark } from "./Logo";

export default function Overview() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const active = candidates.filter((c) => c.status === "active");
    return {
      active: active.length,
      openings: positions.filter((p) => p.status === "open").reduce((n, p) => n + p.openings, 0),
      offers: candidates.filter((c) => c.stage === "offer").length,
      hires: candidates.filter((c) => c.stage === "hired").length,
      pool: candidates.filter((c) => c.in_talent_pool).length,
      avgScore: active.length ? Math.round(active.reduce((s, c) => s + c.score, 0) / active.length) : 0,
    };
  }, [candidates, positions]);

  const funnel = useMemo(
    () => STAGES.map((s) => ({ ...s, count: candidates.filter((c) => c.stage === s.key).length })),
    [candidates]
  );
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  const urgent = useMemo(
    () => positions.filter((p) => p.status === "open" && (p.priority === "urgent" || p.priority === "high")).slice(0, 5),
    [positions]
  );

  const regionRows = useMemo(
    () => REGIONS.map((r) => ({
      region: r,
      candidates: candidates.filter((c) => c.region === r && c.status === "active").length,
      openings: positions.filter((p) => p.region === r && p.status === "open").length,
    })),
    [candidates, positions]
  );

  const recent = useMemo(
    () => [...candidates].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [candidates]
  );

  const openCandidate = (c: Candidate) => { setSelected(c); setOpen(true); };
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;

  return (
    <div className="space-y-6 animate-rise">
      {/* Hero */}
      <div className="cert-surface rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        <EyeMark size={150} className="absolute -right-8 -top-8 opacity-20" spin />
        <div className="relative">
          <p className="micro-label text-emerald mb-2">MyEyeDr · Regional Talent Command</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foil leading-tight">
            Recruiting Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Full-access administrator view across every office. Track candidates through the pipeline,
            keep a verified credential ledger, and place talent where they fit best.
          </p>
          <HoloStrip className="mt-4 max-w-xs" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Active" value={stats.active} icon={Users} tone="cyan" sub="in pipeline" />
        <StatCard label="Openings" value={stats.openings} icon={Briefcase} tone="emerald" sub="seats to fill" />
        <StatCard label="Offers Out" value={stats.offers} icon={Award} tone="gold" sub="awaiting" />
        <StatCard label="Hired" value={stats.hires} icon={TrendingUp} tone="lime" sub="this cycle" />
        <StatCard label="Talent Pool" value={stats.pool} icon={Sparkles} tone="gold" sub="kept warm" />
        <StatCard label="Avg Score" value={stats.avgScore} icon={Activity} tone="holo" sub="active pool" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Pipeline Funnel</h3>
            <span className="text-[11px] text-muted-foreground">{candidates.length} total candidates</span>
          </div>
          <div className="space-y-2.5">
            {funnel.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] font-mono uppercase tracking-wide text-right" style={{ color: `hsl(${f.hsl})` }}>{f.label}</span>
                <div className="flex-1 h-6 rounded-md bg-secondary/50 overflow-hidden relative">
                  <div className="h-full rounded-md transition-all duration-700 flex items-center px-2" style={{ width: `${(f.count / funnelMax) * 100}%`, background: `hsl(${f.hsl} / 0.35)`, borderRight: `2px solid hsl(${f.hsl})` }}>
                  </div>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground">{f.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent openings */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <Flame className="h-4 w-4 text-orange" />
            <h3 className="font-display text-lg font-semibold">Priority Openings</h3>
          </div>
          <div className="space-y-2">
            {urgent.length === 0 && <p className="text-xs text-muted-foreground">No urgent openings.</p>}
            {urgent.map((p) => (
              <div key={p.id} className="rounded-lg bg-background/40 border border-border/60 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate">{p.title}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0" style={{ color: p.priority === "urgent" ? "hsl(var(--destructive))" : "hsl(var(--orange))", background: p.priority === "urgent" ? "hsl(var(--destructive)/0.12)" : "hsl(var(--orange)/0.12)" }}>{p.priority}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{locName(p.location_id)} · {p.openings} seat{p.openings > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regional coverage */}
        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Regional Coverage</h3>
          <div className="space-y-3">
            {regionRows.map((r) => (
              <div key={r.region} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-foreground truncate">{r.region}</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan"><Users className="h-3 w-3" /> {r.candidates}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald"><Briefcase className="h-3 w-3" /> {r.openings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {recent.map((c) => (
              <button key={c.id} onClick={() => openCandidate(c)} className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/40 transition-colors tap-target text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold" style={{ background: `hsl(${stageMeta(c.stage).hsl}/0.14)`, color: `hsl(${stageMeta(c.stage).hsl})` }}>{initials(c.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.applied_role}</p>
                </div>
                <StageBadge stage={c.stage} size="sm" />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <CandidateProfile candidate={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
