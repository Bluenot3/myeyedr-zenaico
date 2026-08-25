import { useMemo, useState } from "react";
import {
  Briefcase, MapPin, ShieldCheck, Copy, ChevronDown, Clock, Flag, Mic, ClipboardCheck,
  History, StickyNote, CheckCircle2, XCircle, Sparkles, Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import {
  Candidate, CandidateRequisition, CandidateEvent, CandidateEvaluation,
  useCandidateRequisitions, useCandidateEvents, useCandidateEvaluations,
  useLocations, usePositions,
} from "@/hooks/useRecruiting";
import { useTranscripts } from "@/hooks/useAgents";
import { STAGES, stageMeta, stageIndex, prettyStatus, relativeTime } from "@/lib/recruiting";

/** Deterministic short hash (FNV-1a) — stable fingerprint for each inscription. */
function fnv(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** 4-glyph visual sigil derived from the hash — a scannable "seal" per application. */
const GLYPHS = "◆◇●○▲△■□◈✦✧⬟⬢⬡✚";
function sigil(hash: string): string {
  return [0, 2, 4, 6].map((i) => GLYPHS[parseInt(hash[i], 16) % GLYPHS.length]).join("");
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

type Verdict = { label: string; tone: string; icon: typeof CheckCircle2 };
function verdictOf(app: CandidateRequisition): Verdict {
  if (app.stage === "hired") return { label: "Hired", tone: "160 84% 46%", icon: CheckCircle2 };
  if (app.stage === "rejected") return { label: "Rejected", tone: "4 73% 60%", icon: XCircle };
  if (app.stage === "withdrawn") return { label: "Withdrawn", tone: "180 10% 55%", icon: XCircle };
  if (app.status === "talent_pool") return { label: "Talent pool", tone: "197 100% 78%", icon: Sparkles };
  return { label: "In process", tone: "210 100% 64%", icon: Hourglass };
}

interface Step {
  key: string;
  icon: typeof History;
  title: string;
  detail: string;
  at: string;
  actor: string;
  tone: string;
}

const TONE: Record<string, string> = {
  applied: "196 100% 70%",
  stage_change: "216 100% 62%",
  screening: "190 100% 74%",
  interview: "186 100% 72%",
  note: "197 100% 78%",
  rejection: "4 73% 60%",
  withdrawal: "180 10% 55%",
  reconsideration: "160 84% 46%",
  assignment: "210 100% 64%",
};

function Seal({
  app, index, prevHash, candidate, events, evaluations, screenings, posLabel, locLabel,
}: {
  app: CandidateRequisition;
  index: number;
  prevHash: string;
  candidate: Candidate;
  events: CandidateEvent[];
  evaluations: CandidateEvaluation[];
  screenings: Step[];
  posLabel: { code: string; title: string };
  locLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const verdict = verdictOf(app);
  const VIcon = verdict.icon;
  const meta = stageMeta(app.stage);

  const hash = useMemo(
    () => fnv(`${prevHash}|${candidate.id}|${app.id}|${app.position_id ?? "none"}|${app.created_at}|${app.stage}|${app.status}`),
    [prevHash, candidate.id, app],
  );
  const mark = sigil(hash);

  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [
      {
        key: `open-${app.id}`,
        icon: Flag,
        title: `Application opened${posLabel.title ? ` — ${posLabel.title}` : ""}`,
        detail: `${locLabel} · via ${app.source || candidate.source || "direct"}`,
        at: app.created_at,
        actor: app.created_by || "System",
        tone: TONE.applied,
      },
      ...events.map((e) => ({
        key: `e-${e.id}`,
        icon: e.event_type === "note" ? StickyNote : History,
        title: e.title || prettyStatus(e.event_type),
        detail: prettyStatus(e.event_type),
        at: e.created_at,
        actor: e.actor || "System",
        tone: TONE[e.event_type] || "180 10% 60%",
      })),
      ...evaluations.map((ev) => ({
        key: `v-${ev.id}`,
        icon: ClipboardCheck,
        title: `${ev.template_name || "Interview"} scorecard ${ev.submitted ? "submitted" : "drafted"}`,
        detail: `${ev.overall_score ?? 0}/100 · ${prettyStatus(ev.recommendation || "pending")}`,
        at: ev.created_at,
        actor: ev.evaluator || "Evaluator",
        tone: TONE.interview,
      })),
      ...screenings,
    ];
    return out.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());
  }, [app, events, evaluations, screenings, posLabel.title, locLabel, candidate.source]);

  const reached = stageIndex(app.stage);
  const terminal = app.stage === "rejected" || app.stage === "withdrawn";
  const lastAt = steps.length ? steps[steps.length - 1].at : app.created_at;
  const elapsed = daysBetween(app.created_at, terminal || app.stage === "hired" ? lastAt : new Date().toISOString());

  const copyProof = () => {
    navigator.clipboard.writeText(`MED-${String(index).padStart(3, "0")}-${hash.toUpperCase()} · ${mark}`);
    toast.success("Inscription code copied");
  };

  return (
    <div
      className="rounded-xl border bg-background/40 overflow-hidden transition-all"
      style={{ borderColor: `hsl(${verdict.tone} / ${open ? 0.45 : 0.22})`, boxShadow: open ? `0 0 24px -14px hsl(${verdict.tone} / 0.7)` : undefined }}
    >
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left tap-target">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span
            className="shrink-0 rounded-md px-1.5 py-1 font-mono text-[11px] leading-none tracking-[0.15em]"
            style={{ color: `hsl(${verdict.tone})`, background: `hsl(${verdict.tone} / 0.12)`, border: `1px solid hsl(${verdict.tone} / 0.3)` }}
            aria-hidden
          >
            {mark}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">
              {posLabel.code && <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{posLabel.code}</span>}
              {posLabel.title || "Unassigned requisition"}
              {app.is_primary && <span className="ml-2 text-[9px] uppercase tracking-wide text-emerald">current</span>}
            </p>
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {locLabel} · {steps.length} step{steps.length === 1 ? "" : "s"} · {elapsed}d
            </p>
          </div>
          <span
            className="hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase shrink-0"
            style={{ color: `hsl(${verdict.tone})`, background: `hsl(${verdict.tone} / 0.12)`, border: `1px solid hsl(${verdict.tone} / 0.3)` }}
          >
            <VIcon className="h-2.5 w-2.5" /> {verdict.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>

        {/* stage rail — always visible, reads at a glance */}
        <div className="flex gap-[3px] px-3 pb-2.5" aria-hidden>
          {STAGES.map((s, i) => {
            const done = !terminal && i <= reached;
            return (
              <span
                key={s.key}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: terminal ? `hsl(${verdict.tone} / ${i <= reached ? 0.5 : 0.12})` : done ? `hsl(${s.hsl})` : "hsl(var(--border))" }}
              />
            );
          })}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 animate-rise">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-emerald">
              <ShieldCheck className="h-2.5 w-2.5" /> Sealed
            </span>
            <span className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-muted-foreground">
              stage {meta.label}
            </span>
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
              {prettyStatus(app.status)}
            </span>
            <button onClick={copyProof} className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 font-mono text-muted-foreground hover:text-foreground">
              <Copy className="h-2.5 w-2.5" /> MED-{String(index).padStart(3, "0")}-{hash}
            </button>
          </div>

          <div className="relative pl-5 space-y-2 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-emerald/40 before:via-border before:to-transparent">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const gap = i === 0 ? 0 : daysBetween(steps[i - 1].at, s.at);
              return (
                <div key={s.key} className="relative">
                  <span className="absolute -left-[18px] top-2.5 flex h-3.5 w-3.5 rounded-full ring-2 ring-card" style={{ background: `hsl(${s.tone})` }} />
                  <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-start gap-2">
                        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: `hsl(${s.tone})` }} />
                        <div className="min-w-0">
                          <p className="text-xs text-foreground leading-snug">{s.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.detail}{s.actor ? ` · ${s.actor}` : ""}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0 text-right">
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {relativeTime(s.at)}</span>
                        {i > 0 && <span className="block text-muted-foreground/60">+{gap}d</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Per-requisition "inscriptions": one sealed badge for every position a candidate applied to.
 * Expanding a badge reveals the exact path taken (screened, interviewed, rejected…) with dates.
 */
export default function ApplicationSeals({ candidate }: { candidate: Candidate }) {
  const { data: applications = [], isLoading } = useCandidateRequisitions(candidate.id);
  const { data: events = [] } = useCandidateEvents(candidate.id);
  const { data: evaluations = [] } = useCandidateEvaluations(candidate.id);
  const { data: transcripts = [] } = useTranscripts(candidate.id);
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();

  const ordered = useMemo(
    () => [...applications].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [applications],
  );

  const screeningSteps = useMemo<Step[]>(
    () => transcripts.map((t) => ({
      key: `t-${t.id}`,
      icon: Mic,
      title: t.title || "Phone screen completed",
      detail: `${t.recommendation || t.sentiment || "recorded"}${t.fit_score != null ? ` · fit ${t.fit_score}` : ""}`,
      at: t.created_at,
      actor: t.source || "Screening",
      tone: TONE.screening,
    })),
    [transcripts],
  );

  if (isLoading) return <p className="text-[11px] text-muted-foreground">Loading inscriptions…</p>;
  if (ordered.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border/60 p-4 text-center">
        No sealed applications yet — assign this candidate to a requisition to mint their first inscription.
      </p>
    );
  }

  let prev = "00000000";
  const seals = ordered.map((app, i) => {
    const pos = positions.find((p) => p.id === app.position_id);
    const scoped = events.filter((e) => e.requisition_id === app.position_id && !!app.position_id);
    const evals = evaluations.filter((ev) => (ev.position_id && ev.position_id === app.position_id));
    const hashSeed = prev;
    prev = fnv(`${prev}|${candidate.id}|${app.id}`);
    return { app, i, hashSeed, pos, scoped, evals };
  });

  const primaryId = ordered.find((a) => a.is_primary)?.id;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-emerald" /> Application inscriptions
        </h4>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald" /> {ordered.length} sealed
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        One seal per position applied to. Tap a seal to open the exact path taken — screening, interview, decision — with dates.
      </p>
      {seals.map(({ app, i, hashSeed, pos, scoped, evals }) => (
        <Seal
          key={app.id}
          app={app}
          index={i + 1}
          prevHash={hashSeed}
          candidate={candidate}
          events={scoped}
          evaluations={evals}
          screenings={app.id === primaryId ? screeningSteps : []}
          posLabel={{ code: pos?.req_code || "", title: pos?.title || "" }}
          locLabel={locations.find((l) => l.id === app.location_id)?.site_name || "—"}
        />
      ))}
    </div>
  );
}
