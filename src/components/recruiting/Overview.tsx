import { useMemo, useState } from "react";
import {
  Users, Briefcase, Award, Sparkles, TrendingUp, Flame, Activity, ArrowRight,
  UploadCloud, PhoneOutgoing, Bot, Clock, Star, ClipboardCheck, ShieldAlert, Gauge, ChevronRight,
} from "lucide-react";
import { useCandidates, usePositions, useLocations, Candidate } from "@/hooks/useRecruiting";
import { STAGES, stageMeta, initials } from "@/lib/recruiting";
import { computeMatch, nextAction, hoursSince } from "@/lib/matchScore";
import StatCard from "./StatCard";
import CandidateProfile from "./CandidateProfile";
import StageBadge from "./StageBadge";
import ScoreRing from "./ScoreRing";

import { EyeMark } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

export default function Overview() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const { profile } = useAuth();
  const firstName = (profile?.full_name || profile?.email?.split("@")[0] || "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);
  const openCandidate = (c: Candidate) => { setSelected(c); setOpen(true); };
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;

  const active = useMemo(() => candidates.filter((c) => c.status === "active"), [candidates]);

  // per-candidate match compute (memoized)
  const enriched = useMemo(
    () => candidates.map((c) => ({ c, m: computeMatch(c), action: nextAction(c, computeMatch(c)) })),
    [candidates]
  );

  const cmd = useMemo(() => {
    const a = enriched.filter((e) => e.c.status === "active");
    return {
      newUploads: candidates.filter((c) => c.stage === "applied").length,
      needOutreach: candidates.filter((c) => c.contact_count === 0 && c.status === "active").length,
      aiReady: candidates.filter((c) => c.stage === "screening").length,
      stuck: a.filter((e) => hoursSince(e.c.last_contacted_at) > 48 && !["hired"].includes(e.c.stage)).length,
      highMatch: a.filter((e) => e.m.overall >= 85).length,
      scheduleRisk: a.filter((e) => ["poor", "unavailable"].includes(e.m.availability.state)).length,
      scorecardsMissing: candidates.filter((c) => ["interview", "assessment"].includes(c.stage) && c.rating === 0).length,
      review: candidates.filter((c) => c.stage === "offer").length,
    };
  }, [enriched, candidates]);

  const stats = useMemo(() => ({
    active: active.length,
    openings: positions.filter((p) => p.status === "open").reduce((n, p) => n + p.openings, 0),
    hires: candidates.filter((c) => c.stage === "hired").length,
    pool: candidates.filter((c) => c.in_talent_pool).length,
    avgScore: enriched.length ? Math.round(enriched.filter((e) => e.c.status === "active").reduce((s, e) => s + e.m.overall, 0) / Math.max(1, active.length)) : 0,
  }), [active, candidates, positions, enriched]);

  // Next best actions — prioritize high-urgency, then stuck, then high match
  const nextBest = useMemo(() => {
    return [...enriched]
      .filter((e) => e.c.status === "active" && e.c.stage !== "hired")
      .map((e) => {
        const stuckH = hoursSince(e.c.last_contacted_at);
        let priority = 0;
        if (e.action.urgency === "high") priority += 40;
        if (e.c.contact_count === 0) priority += 30;
        if (stuckH > 48) priority += 25;
        if (e.m.availability.state === "unverified") priority += 15;
        priority += e.m.overall * 0.2;
        return { ...e, priority };
      })
      .sort((x, y) => y.priority - x.priority)
      .slice(0, 6);
  }, [enriched]);

  const funnel = useMemo(
    () => STAGES.map((s) => ({ ...s, count: candidates.filter((c) => c.stage === s.key).length })),
    [candidates]
  );
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  const commandCards = [
    { label: "New Uploads", value: cmd.newUploads, icon: UploadCloud, tone: "cyan" as const, sub: "just applied" },
    { label: "Need Outreach", value: cmd.needOutreach, icon: PhoneOutgoing, tone: "orange" as const, sub: "not contacted" },
    { label: "AI Screen Ready", value: cmd.aiReady, icon: Bot, tone: "holo" as const, sub: "queue a call" },
    { label: "Stuck 48h+", value: cmd.stuck, icon: Clock, tone: "orange" as const, sub: "aging out" },
    { label: "High Match", value: cmd.highMatch, icon: Star, tone: "emerald" as const, sub: "85+ score" },
    { label: "Schedule Risk", value: cmd.scheduleRisk, icon: ShieldAlert, tone: "orange" as const, sub: "availability" },
    { label: "Scorecards Missing", value: cmd.scorecardsMissing, icon: ClipboardCheck, tone: "gold" as const, sub: "post-interview" },
    { label: "Ready to Review", value: cmd.review, icon: Award, tone: "gold" as const, sub: "manager call" },
  ];

  return (
    <div className="space-y-6 animate-rise">
      {/* Hero */}
      <div className="cert-surface rounded-2xl p-5 sm:p-7 relative overflow-hidden group">
        <EyeMark size={140} className="absolute -right-8 -top-8 opacity-[0.14] transition-transform duration-700 group-hover:scale-105" />
        <div className="relative">
          <p className="text-xs font-medium text-muted-foreground">{today}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foil leading-tight mt-1">
            {greeting}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Here's where your candidates stand today. The cards below show exactly what needs your attention — tap any name to open their profile.
          </p>
        </div>
      </div>

      {/* Command cards */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Gauge className="h-4 w-4 text-emerald" />
          <h2 className="font-display text-lg font-semibold">What needs attention</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {commandCards.map((cc, i) => (
            <div key={cc.label} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <StatCard label={cc.label} value={cc.value} icon={cc.icon} tone={cc.tone} sub={cc.sub} />
            </div>
          ))}
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Active" value={stats.active} icon={Users} tone="cyan" sub="in pipeline" />
        <StatCard label="Open Seats" value={stats.openings} icon={Briefcase} tone="emerald" sub="to fill" />
        <StatCard label="Hired" value={stats.hires} icon={TrendingUp} tone="lime" sub="this cycle" />
        <StatCard label="Talent Pool" value={stats.pool} icon={Sparkles} tone="gold" sub="kept warm" />
        <StatCard label="Avg Match" value={stats.avgScore} icon={Activity} tone="holo" sub="active pool" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Best Actions */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <Flame className="h-4 w-4 text-orange" />
            <h3 className="font-display text-lg font-semibold">Next Best Actions</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">prioritized</span>
          </div>
          <div className="space-y-2">
            {nextBest.length === 0 && <p className="text-xs text-muted-foreground">All clear — no pending actions.</p>}
            {nextBest.map(({ c, m, action }) => (
              <button key={c.id} onClick={() => openCandidate(c)} className="w-full flex items-center gap-3 rounded-lg bg-background/40 border border-border/60 p-2.5 hover:border-emerald/40 transition-colors tap-target text-left">
                <ScoreRing score={m.overall} size={40} stroke={4} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{c.full_name}</span>
                    <StageBadge stage={c.stage} size="sm" />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{c.applied_role} · {locName(c.location_id) || c.region}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 shrink-0"
                  style={{
                    color: action.urgency === "high" ? "hsl(190 100% 72%)" : "hsl(214 100% 64%)",
                    background: action.urgency === "high" ? "hsl(190 100% 72% / 0.12)" : "hsl(214 100% 64% / 0.1)",
                  }}
                >
                  {action.label} <ChevronRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Pipeline Funnel</h3>
          <div className="space-y-2.5">
            {funnel.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[10px] font-mono uppercase tracking-wide text-right truncate" style={{ color: `hsl(${f.hsl})` }}>{f.label}</span>
                <div className="flex-1 h-5 rounded-md bg-secondary/50 overflow-hidden relative">
                  <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(f.count / funnelMax) * 100}%`, background: `hsl(${f.hsl} / 0.35)`, borderRight: `2px solid hsl(${f.hsl})` }} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-foreground">{f.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional coverage — derived from live data */}
      {(() => {
        const regionSet = Array.from(
          new Set([
            ...active.map((c) => c.region).filter(Boolean),
            ...positions.map((p) => p.region).filter(Boolean),
          ])
        );
        return (
          <div className="glass-panel rounded-xl p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Regional Coverage</h3>
            {regionSet.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No regions yet — add locations and candidates to see coverage here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {regionSet.map((r) => {
                  const cand = active.filter((c) => c.region === r).length;
                  const opens = positions.filter((p) => p.region === r && p.status === "open").length;
                  return (
                    <div key={r} className="flex items-center gap-3 rounded-lg bg-background/40 border border-border/60 p-2.5">
                      <span className="flex-1 text-xs text-foreground truncate">{r}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-cyan"><Users className="h-3 w-3" /> {cand}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald"><Briefcase className="h-3 w-3" /> {opens}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}


      <CandidateProfile candidate={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
