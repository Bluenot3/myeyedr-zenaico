import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Star, Phone, Mail, Sparkles, Trash2, Save, Plus, ShieldCheck, MapPin,
  Briefcase, Clock, ArrowRight, MessageSquarePlus, Pin, PinOff, X, ChevronRight, Gauge,
  FileText, Loader2, Mic, ClipboardCheck, Eye, GraduationCap, CheckCircle2, XCircle, AlertTriangle, RotateCcw,
} from "lucide-react";
import InterviewMedia from "./InterviewMedia";
import EvaluationPanel from "./EvaluationPanel";
import CandidateSignals from "./CandidateSignals";
import OnboardingTracker from "./OnboardingTracker";
import { uploadCandidateFile, UploadedDoc } from "@/lib/storage";
import {
  Candidate, useCandidateBadges, useContactLog, useCandidateNotes,
  useUpdateCandidate, useDeleteCandidate, useAddBadge, useLogContact,
  useAddNote, useUpdateNote, useDeleteNote, useLocations, usePositions,
  useCandidates, useCandidateLifecycle,
} from "@/hooks/useRecruiting";
import { STAGES, stageMeta, stageProgress, initials, relativeTime, scoreTone, TONE_HSL, BADGE_TYPES, badgeMeta } from "@/lib/recruiting";
import { computeMatch } from "@/lib/matchScore";
import { FactorBreakdown, AvailabilityGauge, RiskReadiness, VerificationChecklist, MatchBadgeChip, MatchBar } from "./MatchVisuals";
import BlockchainLedger from "./BlockchainLedger";
import ScoreRing from "./ScoreRing";
import StageBadge from "./StageBadge";
import HoloStrip from "./HoloStrip";
import { EyeMark } from "./Logo";


interface Props {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialTab?: string;
  eventId?: string | null;
}

export default function CandidateProfile({ candidate, open, onOpenChange, initialTab, eventId }: Props) {
  const { data: badges = [] } = useCandidateBadges(candidate?.id ?? null);
  const { data: contacts = [] } = useContactLog(candidate?.id ?? null);
  const { data: notes = [] } = useCandidateNotes(candidate?.id ?? null);
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();
  const { data: allCandidates = [] } = useCandidates();
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const addBadge = useAddBadge();
  const logContact = useLogContact();
  const addNote = useAddNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const lifecycle = useCandidateLifecycle();

  const [form, setForm] = useState<Partial<Candidate>>({});
  const [noteBody, setNoteBody] = useState("");
  const [contactForm, setContactForm] = useState({ method: "phone", outcome: "reached", notes: "" });
  const [showSeal, setShowSeal] = useState(false);
  const [seal, setSeal] = useState({ badge_type: "evaluation", title: "", score: "", summary: "", status: "verified" });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [tab, setTab] = useState(initialTab || "match");
  const [decisionMode, setDecisionMode] = useState<null | "reject" | "pool">(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [poolRoles, setPoolRoles] = useState("");
  const docInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candidate) setForm({ ...candidate });
  }, [candidate]);

  useEffect(() => {
    if (open) setTab(initialTab || "match");
  }, [open, initialTab, candidate?.id]);

  if (!candidate) return null;
  const loc = locations.find((l) => l.id === candidate.location_id);
  const sTone = TONE_HSL[scoreTone(candidate.score)];
  const m = computeMatch(candidate);

  const isHired = candidate.status === "hired" || candidate.stage === "hired";
  const isRejected = candidate.status === "rejected" || candidate.stage === "rejected";
  const showOnboarding = isHired;

  // Reapplication flag: any *other* archived/rejected candidate record with the same email.
  const priorArchived = (candidate.email
    ? allCandidates.filter(
        (c) =>
          c.id !== candidate.id &&
          c.email &&
          c.email.toLowerCase() === candidate.email.toLowerCase() &&
          (c.status === "rejected" || c.stage === "rejected")
      )
    : []);
  const isReapplicant = priorArchived.length > 0 && !isRejected;

  const patch = (u: Partial<Candidate>) => setForm((p) => ({ ...p, ...u }));

  const handleDocUpload = async (files: FileList | null) => {
    if (!files?.length || !candidate) return;
    setUploadingDoc(true);
    try {
      const added: UploadedDoc[] = [];
      for (const file of Array.from(files)) {
        const { url } = await uploadCandidateFile(file);
        added.push({ name: file.name, url, type: file.type, size: file.size, kind: "attachment" });
      }
      const next = [...(candidate.documents || []), ...added];
      updateCandidate.mutate({ id: candidate.id, documents: next as any, resume_url: candidate.resume_url || next.find((d) => d.kind === "resume")?.url || "" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDoc = (url: string) => {
    if (!candidate) return;
    const next = (candidate.documents || []).filter((d) => d.url !== url);
    updateCandidate.mutate({ id: candidate.id, documents: next as any });
  };



  const handleStage = (stage: string) => {
    const score = Math.max(candidate.score, stageProgress(stage));
    updateCandidate.mutate({ id: candidate.id, stage, score });
    patch({ stage, score });
  };

  const handleSave = () => {
    const { id, created_at, updated_at, ...u } = form as any;
    updateCandidate.mutate({ id: candidate.id, ...u });
  };

  const handleSeal = () => {
    if (!seal.title.trim()) return;
    addBadge.mutate({
      candidate_id: candidate.id,
      badge_type: seal.badge_type,
      title: seal.title,
      status: seal.status,
      score: seal.score ? Number(seal.score) : null,
      summary: seal.summary,
    });
    setSeal({ badge_type: "evaluation", title: "", score: "", summary: "", status: "verified" });
    setShowSeal(false);
  };

  const handleLogContact = () => {
    logContact.mutate({
      candidate_id: candidate.id,
      method: contactForm.method,
      outcome: contactForm.outcome,
      notes: contactForm.notes,
      contact_count: candidate.contact_count,
    });
    setContactForm({ method: "phone", outcome: "reached", notes: "" });
  };

  // Talent-pool best-fit suggestions
  const suggestions = candidate.in_talent_pool
    ? positions.filter(
        (p) =>
          p.status === "open" &&
          (candidate.best_fit_roles.toLowerCase().includes(p.title.toLowerCase().split(" ")[0]) ||
            p.region === candidate.region)
      ).slice(0, 4)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 glass-panel border-l border-border">
        {/* Header */}
        <div className="cert-surface p-5 sm:p-6 relative overflow-hidden">
          <EyeMark size={120} className="absolute -right-6 -top-6 opacity-20" spin />
          <div className="flex items-start gap-4 relative">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold"
              style={{ background: `hsl(${stageMeta(candidate.stage).hsl} / 0.14)`, color: `hsl(${stageMeta(candidate.stage).hsl})`, border: `1.5px solid hsl(${stageMeta(candidate.stage).hsl} / 0.4)` }}
            >
              {initials(candidate.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground truncate">{candidate.full_name}</h2>
                {candidate.in_talent_pool && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-gold" style={{ background: "hsl(var(--gold)/0.12)", border: "1px solid hsl(var(--gold)/0.35)" }}>
                    <Sparkles className="h-2.5 w-2.5" /> Pool
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{candidate.headline || candidate.applied_role}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StageBadge stage={candidate.stage} size="sm" />
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < candidate.rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                  ))}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <ScoreRing score={m.overall} size={64} label="match" />
              <span className="text-[8px] font-mono uppercase tracking-wide text-center leading-tight max-w-[64px]" style={{ color: `hsl(${m.categoryHsl})` }}>{m.category}</span>
            </div>
          </div>

          {/* Quick contact */}
          <div className="flex items-center gap-2 mt-4 relative">
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Email</Button>
              </a>
            )}
            {candidate.phone && (
              <a href={`tel:${candidate.phone}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> Call</Button>
              </a>
            )}
          </div>
        </div>

        {/* Stage stepper */}
        <div className="px-5 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="micro-label text-muted-foreground">Pipeline Stage</span>
            <span className="text-[11px] text-muted-foreground">{stageProgress(candidate.stage)}% complete</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STAGES.map((s) => {
              const active = s.key === candidate.stage;
              const passed = STAGES.findIndex((x) => x.key === s.key) < STAGES.findIndex((x) => x.key === candidate.stage);
              return (
                <button
                  key={s.key}
                  onClick={() => handleStage(s.key)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-all tap-target"
                  style={{
                    color: active || passed ? `hsl(${s.hsl})` : "hsl(var(--muted-foreground))",
                    background: active ? `hsl(${s.hsl} / 0.16)` : passed ? `hsl(${s.hsl} / 0.08)` : "transparent",
                    border: `1px solid ${active ? `hsl(${s.hsl} / 0.5)` : "hsl(var(--border))"}`,
                  }}
                >
                  {s.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Re-applicant flag */}
        {isReapplicant && (
          <div className="mx-5 sm:mx-6 mt-4 rounded-xl border p-3 flex items-start gap-2.5" style={{ background: "hsl(var(--gold)/0.10)", borderColor: "hsl(var(--gold)/0.4)" }}>
            <AlertTriangle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Previously archived applicant</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                This email matches {priorArchived.length} archived record{priorArchived.length === 1 ? "" : "s"}
                {priorArchived[0]?.applied_role ? ` (last: ${priorArchived[0].applied_role})` : ""}. Review prior history before advancing.
              </p>
            </div>
          </div>
        )}

        {/* Decision / lifecycle bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-border">
          {isHired ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border p-3" style={{ background: "hsl(var(--emerald)/0.10)", borderColor: "hsl(var(--emerald)/0.4)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                <span className="text-xs font-medium text-foreground">Hired — onboarding in progress</span>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setTab("onboarding")}>
                <GraduationCap className="h-3.5 w-3.5" /> Open checklist
              </Button>
            </div>
          ) : isRejected ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border p-3" style={{ background: "hsl(var(--destructive)/0.08)", borderColor: "hsl(var(--destructive)/0.35)" }}>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium text-foreground">Archived — kept on file for future applications</span>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => lifecycle.restore.mutate({ candidate: candidate, toStage: "screening" })} disabled={lifecycle.restore.isPending}>
                <RotateCcw className="h-3.5 w-3.5" /> Reactivate
              </Button>
            </div>
          ) : decisionMode === "reject" ? (
            <div className="rounded-xl border border-border p-3 space-y-2 animate-rise">
              <Label className="text-[10px]">Reason for archiving (kept on file if they reapply)</Label>
              <Input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} placeholder="e.g. Not enough optical experience" className="h-9 text-xs" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setDecisionMode(null); setDecisionReason(""); }}>Cancel</Button>
                <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={lifecycle.reject.isPending} onClick={() => { lifecycle.reject.mutate({ candidate, reason: decisionReason }); setDecisionMode(null); setDecisionReason(""); }}>
                  {lifecycle.reject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />} Archive candidate
                </Button>
              </div>
            </div>
          ) : decisionMode === "pool" ? (
            <div className="rounded-xl border border-border p-3 space-y-2 animate-rise">
              <Label className="text-[10px]">Best-fit roles</Label>
              <Input value={poolRoles} onChange={(e) => setPoolRoles(e.target.value)} placeholder="e.g. Licensed Optician, Retail Lead" className="h-9 text-xs" />
              <Label className="text-[10px]">Why keep them warm?</Label>
              <Input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} placeholder="e.g. Strong culture fit, revisit for next opening" className="h-9 text-xs" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setDecisionMode(null); setDecisionReason(""); setPoolRoles(""); }}>Cancel</Button>
                <Button size="sm" className="bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25" disabled={lifecycle.pool.isPending} onClick={() => { lifecycle.pool.mutate({ candidate, reason: decisionReason, roles: poolRoles }); setDecisionMode(null); setDecisionReason(""); setPoolRoles(""); }}>
                  {lifecycle.pool.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Add to pool
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <span className="micro-label text-muted-foreground text-[10px]">Decision</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button size="sm" className="h-9 gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90" disabled={lifecycle.hire.isPending} onClick={() => lifecycle.hire.mutate(candidate)}>
                  {lifecycle.hire.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Hire
                </Button>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-gold border-gold/30 hover:bg-gold/10" onClick={() => { setDecisionMode("pool"); setPoolRoles(candidate.best_fit_roles || ""); setDecisionReason(candidate.talent_pool_reason || ""); }}>
                  <Sparkles className="h-3.5 w-3.5" /> Pool
                </Button>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDecisionMode("reject")}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="px-5 sm:px-6 py-4">
          <TabsList className={`w-full grid grid-cols-4 ${showOnboarding ? "sm:grid-cols-9" : "sm:grid-cols-8"} gap-1 h-auto`}>
            <TabsTrigger value="match" className="text-xs gap-1"><Gauge className="h-3.5 w-3.5" /> Match</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs gap-1"><Eye className="h-3.5 w-3.5" /> Signals</TabsTrigger>
            <TabsTrigger value="scorecards" className="text-xs gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> Scores</TabsTrigger>
            <TabsTrigger value="interviews" className="text-xs gap-1"><Mic className="h-3.5 w-3.5" /> Media</TabsTrigger>
            {showOnboarding && <TabsTrigger value="onboarding" className="text-xs gap-1"><GraduationCap className="h-3.5 w-3.5" /> Onboard</TabsTrigger>}
            <TabsTrigger value="ledger" className="text-xs gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Ledger</TabsTrigger>
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          {/* Onboarding checklist */}
          {showOnboarding && (
            <TabsContent value="onboarding" className="mt-4">
              <OnboardingTracker candidate={candidate} />
            </TabsContent>
          )}


          {/* Scorecards / evaluations */}
          <TabsContent value="scorecards" className="mt-4">
            <EvaluationPanel candidate={candidate} eventId={eventId} />
          </TabsContent>

          {/* AI signal scanner */}
          <TabsContent value="signals" className="mt-4">
            <CandidateSignals candidate={candidate} />
          </TabsContent>



          {/* Match score breakdown */}
          <TabsContent value="match" className="mt-4 space-y-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <ScoreRing score={m.overall} size={56} stroke={5} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold leading-none" style={{ color: `hsl(${m.categoryHsl})` }}>{m.category}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Weighted role-fit {m.raw} → gated {m.overall}</p>
                </div>
              </div>
              <div className="mb-3"><MatchBar m={m} height={12} /></div>
              <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg bg-background/40 border border-border/50 p-2.5">{m.explanation}</p>
            </div>


            <RiskReadiness m={m} />
            <AvailabilityGauge m={m} />

            <div className="glass-panel rounded-xl p-4">
              <h4 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-3">Score Breakdown</h4>
              <FactorBreakdown factors={m.factors} />
            </div>

            {m.badges.length > 0 && (
              <div className="glass-panel rounded-xl p-4">
                <h4 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2.5">Signals & Badges</h4>
                <div className="flex flex-wrap gap-1.5">
                  {m.badges.map((b) => <MatchBadgeChip key={b.label} badge={b} />)}
                </div>
              </div>
            )}

            <div className="glass-panel rounded-xl p-4">
              <VerificationChecklist items={m.verification.items} done={m.verification.done} total={m.verification.total} />
            </div>
          </TabsContent>

          {/* Interviews & media */}
          <TabsContent value="interviews" className="mt-4">
            <InterviewMedia candidate={candidate} />
          </TabsContent>




          {/* Ledger */}
          <TabsContent value="ledger" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Credential Ledger</h3>
                <p className="text-[11px] text-muted-foreground">Timestamped, chained records — click any block to expand.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowSeal((s) => !s)}>
                <Plus className="h-3.5 w-3.5" /> Seal
              </Button>
            </div>

            {showSeal && (
              <div className="glass-panel rounded-lg p-3 mb-4 space-y-2.5 animate-rise">
                <HoloStrip className="mb-1" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Type</Label>
                    <select value={seal.badge_type} onChange={(e) => setSeal((s) => ({ ...s, badge_type: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs mt-1">
                      {Object.entries(BADGE_TYPES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Status</Label>
                    <select value={seal.status} onChange={(e) => setSeal((s) => ({ ...s, status: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs mt-1">
                      <option value="verified">Verified</option>
                      <option value="pending">Pending</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Title</Label>
                  <Input value={seal.title} onChange={(e) => setSeal((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. On-site interview" className="h-9 text-xs mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Score (optional)</Label>
                    <Input type="number" value={seal.score} onChange={(e) => setSeal((s) => ({ ...s, score: e.target.value }))} placeholder="0-100" className="h-9 text-xs mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Summary</Label>
                  <Input value={seal.summary} onChange={(e) => setSeal((s) => ({ ...s, summary: e.target.value }))} placeholder="Short note" className="h-9 text-xs mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowSeal(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSeal} disabled={!seal.title.trim() || addBadge.isPending}>Seal to Ledger</Button>
                </div>
              </div>
            )}

            <BlockchainLedger badges={badges} />
          </TabsContent>

          {/* Details */}
          <TabsContent value="details" className="mt-4 space-y-4">
            {suggestions.length > 0 && (
              <div className="glass-panel rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span className="micro-label text-gold text-[10px]">Best-Fit Openings</span>
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { updateCandidate.mutate({ id: candidate.id, position_id: p.id, location_id: p.location_id, region: p.region, applied_role: p.title, in_talent_pool: false, stage: "screening" }); }}
                      className="w-full flex items-center gap-2 rounded-md bg-background/40 border border-border/60 px-2.5 py-2 text-left hover:border-emerald/40 transition-colors tap-target"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-emerald shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.region}</p>
                      </div>
                      <span className="text-[10px] text-emerald inline-flex items-center gap-0.5">Place <ArrowRight className="h-3 w-3" /></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="glass-panel rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald" />
                  <span className="micro-label text-muted-foreground text-[10px]">Documents</span>
                </div>
                <input ref={docInput} type="file" multiple className="hidden" onChange={(e) => { handleDocUpload(e.target.files); e.target.value = ""; }} />
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={uploadingDoc} onClick={() => docInput.current?.click()}>
                  {uploadingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                </Button>
              </div>
              {(candidate.documents?.length ?? 0) === 0 ? (
                <p className="text-[11px] text-muted-foreground py-1">No documents attached.</p>
              ) : (
                <div className="space-y-1.5">
                  {candidate.documents.map((d) => (
                    <div key={d.url} className="flex items-center gap-2 rounded-md bg-background/40 border border-border/60 px-2.5 py-1.5">
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${d.kind === "resume" ? "text-emerald" : "text-holo"}`} />
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-[11px] text-foreground truncate flex-1 hover:text-emerald hover:underline">{d.name}</a>
                      {d.kind === "resume" && <span className="text-[8px] font-mono uppercase text-emerald">résumé</span>}
                      <button onClick={() => removeDoc(d.url)} className="tap-target text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>



            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Applied Role</Label>
                <Input value={form.applied_role || ""} onChange={(e) => patch({ applied_role: e.target.value })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Source</Label>
                <Input value={form.source || ""} onChange={(e) => patch({ source: e.target.value })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Email</Label>
                <Input value={form.email || ""} onChange={(e) => patch({ email: e.target.value })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => patch({ phone: e.target.value })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Location</Label>
                <select value={form.location_id || ""} onChange={(e) => { const l = locations.find(x => x.id === e.target.value); patch({ location_id: e.target.value || null, region: l?.region || form.region }); }} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs mt-1">
                  <option value="">—</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Years Experience</Label>
                <Input type="number" value={form.years_experience ?? 0} onChange={(e) => patch({ years_experience: Number(e.target.value) })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Score</Label>
                <Input type="number" value={form.score ?? 0} onChange={(e) => patch({ score: Number(e.target.value) })} className="h-9 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Rating (0-5)</Label>
                <Input type="number" min={0} max={5} value={form.rating ?? 0} onChange={(e) => patch({ rating: Math.min(5, Math.max(0, Number(e.target.value))) })} className="h-9 text-xs mt-1" />
              </div>
            </div>

            <div className="glass-panel rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-foreground">Talent Pool</span>
                </div>
                <Switch checked={!!form.in_talent_pool} onCheckedChange={(v) => patch({ in_talent_pool: v })} />
              </div>
              {form.in_talent_pool && (
                <div className="mt-3 space-y-2">
                  <div>
                    <Label className="text-[10px]">Best-fit roles</Label>
                    <Input value={form.best_fit_roles || ""} onChange={(e) => patch({ best_fit_roles: e.target.value })} placeholder="e.g. Licensed Optician, Retail Lead" className="h-9 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Reason to keep warm</Label>
                    <Input value={form.talent_pool_reason || ""} onChange={(e) => patch({ talent_pool_reason: e.target.value })} className="h-9 text-xs mt-1" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove candidate?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently deletes {candidate.full_name} and their entire credential ledger.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteCandidate.mutate(candidate.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={handleSave} disabled={updateCandidate.isPending} className="gap-1.5"><Save className="h-4 w-4" /> Save</Button>
            </div>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="mt-4 space-y-4">
            <div className="glass-panel rounded-lg p-3 space-y-2.5">
              <span className="micro-label text-muted-foreground text-[10px]">Log outreach</span>
              <div className="grid grid-cols-2 gap-2">
                <select value={contactForm.method} onChange={(e) => setContactForm((f) => ({ ...f, method: e.target.value }))} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="sms">Text</option>
                  <option value="in_person">In person</option>
                </select>
                <select value={contactForm.outcome} onChange={(e) => setContactForm((f) => ({ ...f, outcome: e.target.value }))} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="reached">Reached</option>
                  <option value="no_answer">No answer</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <Input value={contactForm.notes} onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))} placeholder="What happened?" className="h-9 text-xs" />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleLogContact} disabled={logContact.isPending} className="gap-1.5"><Phone className="h-3.5 w-3.5" /> Log Contact</Button>
              </div>
            </div>

            <div className="space-y-2">
              {contacts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No outreach logged yet.</p>}
              {contacts.map((ct) => (
                <div key={ct.id} className="flex items-start gap-2.5 glass-panel rounded-lg p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                    {ct.method === "phone" ? <Phone className="h-3 w-3 text-cyan" /> : ct.method === "email" ? <Mail className="h-3 w-3 text-holo" /> : <MessageSquarePlus className="h-3 w-3 text-lime" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground capitalize">{ct.method}</span>
                      <span className="text-[10px] px-1.5 rounded-full capitalize" style={{ color: ct.outcome === "reached" || ct.outcome === "scheduled" ? "hsl(var(--emerald))" : "hsl(var(--muted-foreground))" }}>{ct.outcome.replace("_", " ")}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{relativeTime(ct.created_at)}</span>
                    </div>
                    {ct.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{ct.notes}</p>}
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">by {ct.contacted_by}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="glass-panel rounded-lg p-3 space-y-2.5">
              <Input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note…" className="h-9 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && noteBody.trim()) { addNote.mutate({ candidate_id: candidate.id, body: noteBody }); setNoteBody(""); } }} />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => { if (noteBody.trim()) { addNote.mutate({ candidate_id: candidate.id, body: noteBody }); setNoteBody(""); } }} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Note</Button>
              </div>
            </div>
            <div className="space-y-2">
              {notes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>}
              {notes.map((n) => (
                <div key={n.id} className={`glass-panel rounded-lg p-3 ${n.pinned ? "border-gold/40" : ""}`}>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs text-foreground/90">{n.body}</p>
                    <button onClick={() => updateNote.mutate({ id: n.id, candidate_id: candidate.id, pinned: !n.pinned })} className="shrink-0 tap-target">
                      {n.pinned ? <Pin className="h-3.5 w-3.5 text-gold fill-gold" /> : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => deleteNote.mutate({ id: n.id, candidate_id: candidate.id })} className="shrink-0 tap-target"><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                  </div>
                  <p className="text-[9px] text-muted-foreground/70 mt-1.5">{n.author} · {relativeTime(n.created_at)}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
