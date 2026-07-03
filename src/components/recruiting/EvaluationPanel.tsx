import { useMemo, useState } from "react";
import {
  ClipboardCheck, Plus, Star, Trash2, Save, Users, ChevronDown, ChevronUp, Sparkles, Phone, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Candidate, ScorecardTemplate, EvaluationRating, CandidateEvaluation,
  useScorecardTemplates, useCandidateEvaluations, useCreateEvaluation, useDeleteEvaluation,
} from "@/hooks/useRecruiting";
import { useAuth } from "@/hooks/useAuth";
import {
  RECOMMENDATIONS, recMeta, computeWeightedScore, ratingsFromTemplate,
} from "@/lib/scorecard";
import { initials } from "@/lib/recruiting";
import ScoreRing from "./ScoreRing";
import InterviewEvaluationForm from "./InterviewEvaluationForm";

interface Props {
  candidate: Candidate;
  eventId?: string | null;
}

const isRich = (t: ScorecardTemplate) => t.kind === "interview" || t.kind === "phone_screen";

export default function EvaluationPanel({ candidate, eventId }: Props) {
  const { profile } = useAuth();
  const { data: templates = [] } = useScorecardTemplates();
  const { data: evaluations = [] } = useCandidateEvaluations(candidate.id);
  const createEval = useCreateEvaluation();
  const deleteEval = useDeleteEvaluation();

  const evaluatorName = profile?.full_name || profile?.email?.split("@")[0] || "Evaluator";

  // Templates relevant to this candidate's role first
  const orderedTemplates = useMemo(() => {
    const role = (candidate.applied_role || "").toLowerCase();
    return [...templates].sort((a, b) => {
      const am = a.position_id === candidate.position_id || a.role.toLowerCase() === role ? 0 : 1;
      const bm = b.position_id === candidate.position_id || b.role.toLowerCase() === role ? 0 : 1;
      return am - bm;
    });
  }, [templates, candidate]);

  const [activeTemplate, setActiveTemplate] = useState<ScorecardTemplate | null>(null);
  const [ratings, setRatings] = useState<EvaluationRating[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [richForm, setRichForm] = useState<{ template: ScorecardTemplate; existing: CandidateEvaluation | null } | null>(null);

  const startTemplate = (t: ScorecardTemplate) => {
    if (isRich(t)) {
      setRichForm({ template: t, existing: null });
      return;
    }
    setActiveTemplate(t);
    setRatings(ratingsFromTemplate(t.competencies || []));
    setRecommendation("");
    setNotes("");
  };
  const cancelFill = () => setActiveTemplate(null);

  const editRich = (ev: CandidateEvaluation) => {
    const t = templates.find((x) => x.id === ev.template_id);
    if (t) setRichForm({ template: t, existing: ev });
  };

  const liveScore = activeTemplate ? computeWeightedScore(ratings, activeTemplate.competencies || []) : 0;
  const ratedCount = ratings.filter((r) => r.score > 0).length;

  const setScore = (id: string, score: number) =>
    setRatings((rs) => rs.map((r) => (r.id === id ? { ...r, score } : r)));
  const setComment = (id: string, comment: string) =>
    setRatings((rs) => rs.map((r) => (r.id === id ? { ...r, comment } : r)));

  const submit = async () => {
    if (!activeTemplate || ratedCount === 0) return;
    await createEval.mutateAsync({
      candidate_id: candidate.id,
      template_id: activeTemplate.id,
      event_id: eventId || null,
      position_id: candidate.position_id,
      template_name: activeTemplate.name,
      evaluator: evaluatorName,
      ratings: ratings as any,
      overall_score: liveScore,
      recommendation,
      notes,
      submitted: true,
    });
    setActiveTemplate(null);
  };

  /* ---- Fill mode ---- */
  if (activeTemplate) {
    const comps = activeTemplate.competencies || [];
    return (
      <div className="space-y-4 animate-rise">
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ScoreRing score={liveScore} size={52} stroke={5} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{activeTemplate.name}</p>
              <p className="text-[11px] text-muted-foreground">Evaluating as <span className="text-emerald font-medium">{evaluatorName}</span> · {ratedCount}/{comps.length} rated</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {comps.map((c) => {
            const r = ratings.find((x) => x.id === c.id);
            return (
              <div key={c.id} className="glass-panel rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    {c.guidance && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{c.guidance}</p>}
                  </div>
                  <span className="shrink-0 text-[9px] font-mono uppercase text-muted-foreground rounded-full px-1.5 py-0.5 bg-muted">{c.weight}%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setScore(c.id, n)}
                      className="tap-target transition-transform hover:scale-110"
                      aria-label={`${n} star`}
                    >
                      <Star className={`h-6 w-6 ${(r?.score || 0) >= n ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                    </button>
                  ))}
                  {(r?.score || 0) > 0 && (
                    <button onClick={() => setScore(c.id, 0)} className="ml-1 text-[10px] text-muted-foreground hover:text-foreground">clear</button>
                  )}
                </div>
                <Input
                  value={r?.comment || ""}
                  onChange={(e) => setComment(c.id, e.target.value)}
                  placeholder="Evidence / notes for this competency…"
                  className="mt-2.5 h-9 text-xs"
                />
              </div>
            );
          })}
        </div>

        <div className="glass-panel rounded-xl p-4 space-y-3">
          <div>
            <Label className="text-[10px]">Overall recommendation</Label>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {RECOMMENDATIONS.map((rec) => {
                const active = recommendation === rec.key;
                return (
                  <button
                    key={rec.key}
                    onClick={() => setRecommendation(rec.key)}
                    className="rounded-lg border px-1 py-2 text-[10px] font-medium leading-tight transition-all"
                    style={{
                      color: active ? `hsl(${rec.hsl})` : "hsl(var(--muted-foreground))",
                      background: active ? `hsl(${rec.hsl} / 0.14)` : "transparent",
                      borderColor: active ? `hsl(${rec.hsl} / 0.5)` : "hsl(var(--border))",
                    }}
                  >
                    {rec.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Summary notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Overall impression, next steps…" className="mt-1" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={cancelFill}>Cancel</Button>
          <Button onClick={submit} disabled={ratedCount === 0 || createEval.isPending} className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90">
            <Save className="h-4 w-4" /> Save Evaluation
          </Button>
        </div>
      </div>
    );
  }

  /* ---- List mode ---- */
  return (
    <div className="space-y-4 animate-rise">
      {/* Start a new evaluation */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <ClipboardCheck className="h-4 w-4 text-emerald" />
          <h4 className="text-sm font-semibold">Start an evaluation</h4>
        </div>
        {orderedTemplates.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No scorecard templates yet. Create one in the Library → Scorecards.</p>
        ) : (
          <div className="space-y-1.5">
            {orderedTemplates.map((t) => {
              const match = t.position_id === candidate.position_id || t.role.toLowerCase() === (candidate.applied_role || "").toLowerCase();
              return (
                <button
                  key={t.id}
                  onClick={() => startTemplate(t)}
                  className="w-full flex items-center gap-2.5 rounded-lg bg-background/40 border border-border/60 p-2.5 text-left hover:border-emerald/40 transition-colors tap-target"
                >
                  <div className="h-8 w-8 grid place-items-center rounded-lg bg-emerald/12 text-emerald border border-emerald/25 shrink-0">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{(t.competencies || []).length} competencies{t.role ? ` · ${t.role}` : ""}</p>
                  </div>
                  {match && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase text-emerald rounded-full px-1.5 py-0.5 bg-emerald/12 shrink-0">
                      <Sparkles className="h-2.5 w-2.5" /> best fit
                    </span>
                  )}
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Submitted evaluations */}
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <Users className="h-4 w-4 text-holo" />
          <h4 className="text-sm font-semibold">Evaluator scorecards</h4>
          <span className="ml-auto text-[11px] text-muted-foreground">{evaluations.length} submitted</span>
        </div>
        {evaluations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground rounded-lg bg-background/40 border border-border/50 p-3">
            No evaluations yet. When you invite colleagues to interview {candidate.full_name.split(" ")[0]}, each of their scorecards will collect here.
          </p>
        ) : (
          <div className="space-y-2">
            {evaluations.map((ev) => (
              <EvalCard key={ev.id} ev={ev} expanded={expanded === ev.id} onToggle={() => setExpanded((x) => (x === ev.id ? null : ev.id))} onDelete={() => deleteEval.mutate({ id: ev.id, candidate_id: candidate.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EvalCard({ ev, expanded, onToggle, onDelete }: { ev: CandidateEvaluation; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const rec = recMeta(ev.recommendation);
  return (
    <div className="glass-panel rounded-xl p-3">
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
        <ScoreRing score={ev.overall_score} size={42} stroke={4} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 grid place-items-center rounded-full bg-holo/12 text-holo text-[8px] font-bold shrink-0">{initials(ev.evaluator)}</span>
            <p className="text-xs font-semibold text-foreground truncate">{ev.evaluator}</p>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{ev.template_name} · {new Date(ev.created_at).toLocaleDateString()}</p>
        </div>
        {ev.recommendation && (
          <span className="shrink-0 text-[10px] font-medium rounded-md px-2 py-1" style={{ color: `hsl(${rec.hsl})`, background: `hsl(${rec.hsl} / 0.12)` }}>{rec.label}</span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-2 animate-rise">
          {(ev.ratings || []).map((r) => (
            <div key={r.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-foreground/85 truncate">{r.label}</span>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.score ? "fill-gold text-gold" : "text-muted-foreground/25"}`} />
                  ))}
                </span>
              </div>
              {r.comment && <p className="text-[10px] text-muted-foreground italic mt-0.5">{r.comment}</p>}
            </div>
          ))}
          {ev.notes && <p className="text-[11px] text-foreground/80 rounded-lg bg-background/40 border border-border/50 p-2 mt-2">{ev.notes}</p>}
          <div className="flex justify-end">
            <button onClick={onDelete} className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}
