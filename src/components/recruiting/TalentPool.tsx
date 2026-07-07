import { useMemo, useState } from "react";
import { Sparkles, Search, ArrowRight, Briefcase, MapPin, Archive, RotateCcw, AlertTriangle } from "lucide-react";
import { useCandidates, usePositions, useLocations, useUpdateCandidate, useCandidateLifecycle, Candidate } from "@/hooks/useRecruiting";
import { initials, stageMeta, relativeTime, scoreTone, TONE_HSL } from "@/lib/recruiting";
import CandidateProfile from "./CandidateProfile";
import HoloStrip from "./HoloStrip";
import { Button } from "@/components/ui/button";

type Mode = "pool" | "archived";

export default function TalentPool() {
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const updateCandidate = useUpdateCandidate();
  const lifecycle = useCandidateLifecycle();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("pool");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);

  const matchesSearch = (c: Candidate) =>
    !search || [c.full_name, c.best_fit_roles, c.applied_role, c.region].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()));

  const pool = useMemo(
    () => candidates.filter((c) => c.in_talent_pool && c.stage !== "rejected" && c.status !== "rejected" && matchesSearch(c)),
    [candidates, search]
  );

  const archived = useMemo(
    () => candidates.filter((c) => (c.stage === "rejected" || c.status === "rejected") && matchesSearch(c)),
    [candidates, search]
  );

  // Emails that appear more than once (potential re-applicants across archived + active records).
  const emailCounts = useMemo(() => {
    const m: Record<string, number> = {};
    candidates.forEach((c) => { if (c.email) m[c.email.toLowerCase()] = (m[c.email.toLowerCase()] || 0) + 1; });
    return m;
  }, [candidates]);

  const openPositions = positions.filter((p) => p.status === "open");
  const matchFor = (c: Candidate) =>
    openPositions.filter((p) => {
      const fit = c.best_fit_roles.toLowerCase();
      const titleWord = p.title.toLowerCase().split(" ")[0];
      return fit.includes(titleWord) || p.title.toLowerCase().includes((c.applied_role || "").toLowerCase()) || p.region === c.region;
    }).slice(0, 3);

  const place = (c: Candidate, positionId: string) => {
    const p = positions.find((x) => x.id === positionId);
    if (!p) return;
    updateCandidate.mutate({ id: c.id, position_id: p.id, location_id: p.location_id, region: p.region, applied_role: p.title, in_talent_pool: false, stage: "screening", status: "active" });
  };

  const openCandidate = (c: Candidate) => { setSelected(c); setOpen(true); };
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;


  return (
    <div className="space-y-4 animate-rise">
      <div className="cert-surface rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-gold" />
          <h2 className="font-display text-2xl font-bold text-engrave">Talent Pool</h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-lg">Vetted candidates kept warm for future openings. Match them to live requisitions and place with one click.</p>
        <HoloStrip className="mt-3 max-w-[200px]" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pool by name, role, or region…" className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card/60 focus:outline-none focus:ring-2 focus:ring-gold/40" />
      </div>

      {pool.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Talent pool is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Flag strong candidates into the pool from their profile to keep them warm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pool.map((c) => {
            const matches = matchFor(c);
            const sTone = TONE_HSL[scoreTone(c.score)];
            return (
              <div key={c.id} className="glass-panel rounded-xl p-4 hover-lift border-gold/20">
                <div className="flex items-start gap-3">
                  <button onClick={() => openCandidate(c)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display font-bold" style={{ background: `hsl(${stageMeta(c.stage).hsl}/0.14)`, color: `hsl(${stageMeta(c.stage).hsl})`, border: `1.5px solid hsl(${stageMeta(c.stage).hsl}/0.4)` }}>{initials(c.full_name)}</button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => openCandidate(c)} className="text-left w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{c.full_name}</span>
                        <span className="font-display font-bold text-sm" style={{ color: `hsl(${sTone})` }}>{c.score}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{c.headline || c.applied_role}</p>
                    </button>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {c.region}</span>
                      <span>· added {relativeTime(c.last_contacted_at)}</span>
                    </div>
                  </div>
                </div>

                {c.best_fit_roles && (
                  <div className="mt-3 rounded-lg bg-gold/8 border border-gold/20 px-2.5 py-2">
                    <p className="micro-label text-[9px] text-gold mb-0.5">Best fit</p>
                    <p className="text-[11px] text-foreground/90">{c.best_fit_roles}</p>
                    {c.talent_pool_reason && <p className="text-[10px] text-muted-foreground mt-1 italic">{c.talent_pool_reason}</p>}
                  </div>
                )}

                {/* Match suggestions */}
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="micro-label text-[9px] text-emerald mb-1.5">Matched Openings</p>
                  {matches.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">No live matches right now.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {matches.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-md bg-background/40 border border-border/60 px-2.5 py-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-emerald shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate">{p.title}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{locName(p.location_id)}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald gap-0.5" onClick={() => place(c, p.id)}>Place <ArrowRight className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CandidateProfile candidate={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
