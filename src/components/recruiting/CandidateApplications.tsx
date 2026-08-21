import { useMemo, useState } from "react";
import { Briefcase, Plus, Sparkles, Star, Loader2, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Candidate, Position, useCandidateRequisitions, usePositions, useLocations,
  useCreateApplication, useReassignRequisition,
} from "@/hooks/useRecruiting";
import { useAuth } from "@/hooks/useAuth";
import { stageMeta, relativeTime } from "@/lib/recruiting";
import { toast } from "sonner";

/** Lightweight, explainable match ranker for suggesting other openings. */
export function rankOpening(candidate: Candidate, p: Position): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 40;
  const hay = [
    candidate.applied_role, candidate.headline, candidate.best_fit_roles,
    (candidate.tags || []).join(" "), candidate.resume_summary,
  ].join(" ").toLowerCase();
  const title = (p.title || "").toLowerCase();
  const words = title.split(/[^a-z]+/).filter((w) => w.length > 3);
  const hits = words.filter((w) => hay.includes(w));
  if (hits.length) {
    score += Math.min(30, hits.length * 12);
    reasons.push(`Role keywords match (${hits.slice(0, 3).join(", ")})`);
  }
  if (p.location_id && p.location_id === candidate.location_id) {
    score += 15;
    reasons.push("Same office as their current application");
  } else if (p.region && p.region === candidate.region) {
    score += 9;
    reasons.push("Same region");
  }
  if (candidate.years_experience >= 2) {
    score += Math.min(10, candidate.years_experience * 2);
    reasons.push(`${candidate.years_experience} yrs experience`);
  }
  if (candidate.score >= 75) { score += 6; reasons.push(`Strong overall score (${candidate.score})`); }
  if (p.priority === "urgent" || p.priority === "high") { score += 4; reasons.push("High-priority opening"); }
  return { score: Math.max(0, Math.min(99, score)), reasons };
}

interface Props { candidate: Candidate }

export default function CandidateApplications({ candidate }: Props) {
  const { profile } = useAuth();
  const { data: apps = [], isLoading } = useCandidateRequisitions(candidate.id);
  const { data: positions = [] } = usePositions();
  const { data: locations = [] } = useLocations();
  const createApp = useCreateApplication();
  const reassign = useReassignRequisition();

  const [picker, setPicker] = useState("");
  const actor = profile?.full_name || profile?.email?.split("@")[0] || "Administrator";

  const posById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name || "—";

  const appliedIds = useMemo(() => {
    const s = new Set(apps.map((a) => a.position_id).filter(Boolean) as string[]);
    if (candidate.position_id) s.add(candidate.position_id);
    return s;
  }, [apps, candidate.position_id]);

  const openPositions = useMemo(
    () => positions.filter((p) => p.status === "open" && !appliedIds.has(p.id)),
    [positions, appliedIds],
  );

  const suggestions = useMemo(
    () =>
      openPositions
        .map((p) => ({ position: p, ...rankOpening(candidate, p) }))
        .filter((s) => s.score >= 55)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [openPositions, candidate],
  );

  const apply = async (p: Position, makePrimary = false) => {
    if (makePrimary) {
      await reassign.mutateAsync({
        candidate,
        position_id: p.id,
        location_id: p.location_id,
        region: p.region,
        actor,
        positionTitle: p.title,
      });
      return;
    }
    await createApp.mutateAsync({
      candidate_id: candidate.id,
      position_id: p.id,
      location_id: p.location_id,
      source: candidate.source,
      stage: "applied",
      is_primary: false,
      created_by: actor,
      title: `Also applied to ${p.title}`,
    });
    toast.success(`Added application: ${p.title}`);
    setPicker("");
  };

  const busy = createApp.isPending || reassign.isPending;

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-emerald" />
          <span className="micro-label text-muted-foreground text-[10px]">Applications ({apps.length || (candidate.position_id ? 1 : 0)})</span>
        </div>
        <span className="text-[10px] text-muted-foreground">One candidate, many openings — history is kept per requisition.</span>
      </div>

      {/* Current applications */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading applications…</div>
      ) : apps.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {candidate.position_id
            ? `Applied to ${posById.get(candidate.position_id)?.title || candidate.applied_role}. Add another opening below to run them in parallel.`
            : "No requisition linked yet — assign one below."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {apps.map((a) => {
            const p = a.position_id ? posById.get(a.position_id) : undefined;
            const sm = stageMeta(a.stage);
            const closed = p && p.status !== "open";
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-background/40 border border-border/60 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground truncate">{p?.title || "Unlinked requisition"}</p>
                    {a.is_primary && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase text-emerald rounded-full px-1.5 py-0.5 bg-emerald/12">
                        <Star className="h-2.5 w-2.5" /> primary
                      </span>
                    )}
                    {closed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase text-muted-foreground rounded-full px-1.5 py-0.5 bg-muted">
                        <Lock className="h-2.5 w-2.5" /> {p?.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {locName(a.location_id)} · {a.source || "direct"} · added {relativeTime(a.created_at)}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[9px] font-mono uppercase tracking-wide rounded-full px-1.5 py-0.5"
                  style={{ color: `hsl(${sm.hsl})`, background: `hsl(${sm.hsl} / 0.12)` }}
                >
                  {sm.short}
                </span>
                {!a.is_primary && p && (
                  <button
                    disabled={busy}
                    onClick={() => apply(p, true)}
                    className="shrink-0 text-[10px] text-emerald hover:underline disabled:opacity-50"
                  >
                    Make primary
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI-suggested other openings */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border p-2.5" style={{ background: "hsl(var(--gold)/0.08)", borderColor: "hsl(var(--gold)/0.32)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="micro-label text-gold text-[10px]">Also a fit for</span>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <div key={s.position.id} className="flex items-center gap-2 rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{s.position.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {locName(s.position.location_id)} · {s.reasons.slice(0, 2).join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-gold">{s.score}</span>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px] shrink-0" disabled={busy} onClick={() => apply(s.position)}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Apply
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual add */}
      <div>
        <Label className="text-[10px]">Apply to another opening</Label>
        <div className="flex items-center gap-2 mt-1">
          <select
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Select an open requisition…</option>
            {openPositions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}{p.req_code ? ` · ${p.req_code}` : ""} — {locName(p.location_id)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs bg-emerald text-primary-foreground hover:bg-emerald/90"
            disabled={!picker || busy}
            onClick={() => { const p = openPositions.find((x) => x.id === picker); if (p) apply(p); }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />} Add
          </Button>
        </div>
        {openPositions.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">No other open requisitions available.</p>}
      </div>
    </div>
  );
}
