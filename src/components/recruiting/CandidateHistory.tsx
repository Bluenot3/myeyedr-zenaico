import { useMemo, useState } from "react";
import {
  History, ArrowRightLeft, Briefcase, MapPin, Clock, Loader2, CheckCircle2, Link2, ShieldCheck,
  Mic, ClipboardCheck, StickyNote, Flag,
} from "lucide-react";
import {
  Candidate, useCandidateRequisitions, useCandidateEvents, useReassignRequisition,
  useLocations, usePositions, useCandidateEvaluations, useCandidateNotes,
} from "@/hooks/useRecruiting";
import { useTranscripts } from "@/hooks/useAgents";
import { relativeTime, stageMeta, prettyStatus } from "@/lib/recruiting";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Deterministic short hash (FNV-1a) — gives each ledger block a stable fingerprint. */
function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

interface LedgerBlock {
  key: string;
  kind: string;
  icon: typeof History;
  title: string;
  detail: string;
  at: string;
  actor: string;
  tone: string;
}

const eventTone: Record<string, string> = {
  applied: "196 100% 70%",
  requisition_add: "210 100% 64%",
  assignment: "210 100% 64%",
  stage_change: "216 100% 62%",
  screening: "190 100% 74%",
  interview: "186 100% 72%",
  note: "197 100% 78%",
  rejection: "4 73% 60%",
  withdrawal: "180 10% 55%",
  reconsideration: "160 84% 46%",
};

export default function CandidateHistory({ candidate }: { candidate: Candidate }) {
  const { data: applications = [], isLoading: loadingApps } = useCandidateRequisitions(candidate.id);
  const { data: events = [], isLoading: loadingEvents } = useCandidateEvents(candidate.id);
  const { data: evaluations = [] } = useCandidateEvaluations(candidate.id);
  const { data: notes = [] } = useCandidateNotes(candidate.id);
  const { data: transcripts = [] } = useTranscripts(candidate.id);
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();
  const reassign = useReassignRequisition();


  const [showAssign, setShowAssign] = useState(false);
  const [newLoc, setNewLoc] = useState(candidate.location_id || "");
  const [newPos, setNewPos] = useState("");

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name || "—";
  const posInfo = (id: string | null) => positions.find((p) => p.id === id);

  const locPositions = useMemo(
    () => positions.filter((p) => !newLoc || p.location_id === newLoc),
    [positions, newLoc],
  );

  const doReassign = async () => {
    const loc = locations.find((l) => l.id === newLoc);
    const pos = posInfo(newPos);
    await reassign.mutateAsync({
      candidate,
      position_id: newPos || null,
      location_id: newLoc || null,
      region: loc?.region,
      positionTitle: pos?.title,
    });
    setShowAssign(false);
    setNewPos("");
  };

  /** Every recorded touchpoint, chained oldest → newest with linked fingerprints. */
  const chain = useMemo(() => {
    const blocks: LedgerBlock[] = [];

    blocks.push({
      key: `origin-${candidate.id}`,
      kind: "applied",
      icon: Flag,
      title: `${candidate.full_name} entered the system`,
      detail: `${candidate.applied_role || "Role not set"} · ${candidate.source || "Direct"}`,
      at: candidate.created_at,
      actor: candidate.source || "Application",
      tone: eventTone.applied,
    });

    for (const a of applications) {
      const pos = posInfo(a.position_id);
      blocks.push({
        key: `app-${a.id}`,
        kind: "requisition",
        icon: Briefcase,
        title: pos ? `Applied to ${pos.req_code ? pos.req_code + " · " : ""}${pos.title}` : "Applied to an unassigned requisition",
        detail: `${locName(a.location_id)} · stage ${stageMeta(a.stage).label} · ${prettyStatus(a.status)}`,
        at: a.created_at,
        actor: a.created_by || "System",
        tone: eventTone.requisition_add,
      });
    }

    for (const e of events) {
      blocks.push({
        key: `evt-${e.id}`,
        kind: e.event_type,
        icon: History,
        title: e.title || prettyStatus(e.event_type),
        detail: prettyStatus(e.event_type),
        at: e.created_at,
        actor: e.actor || "System",
        tone: eventTone[e.event_type] || "180 10% 60%",
      });
    }

    for (const t of transcripts) {
      const q = Object.keys(t.extracted || {}).length;
      blocks.push({
        key: `scr-${t.id}`,
        kind: "screening",
        icon: Mic,
        title: t.title || "Phone screen completed",
        detail: `${t.recommendation || t.sentiment || "recorded"}${t.fit_score != null ? ` · fit ${t.fit_score}` : ""}${q ? ` · ${q} answers captured` : ""}`,
        at: t.created_at,
        actor: t.source || "Screening",
        tone: eventTone.screening,
      });
    }

    for (const ev of evaluations) {
      blocks.push({
        key: `eval-${ev.id}`,
        kind: "interview",
        icon: ClipboardCheck,
        title: `${ev.template_name || "Interview"} scorecard${ev.submitted ? " submitted" : " drafted"}`,
        detail: `${ev.overall_score ?? 0}/100 · ${prettyStatus(ev.recommendation || "pending")}`,
        at: ev.created_at,
        actor: ev.evaluator || "Evaluator",
        tone: eventTone.interview,
      });
    }

    for (const n of notes) {
      blocks.push({
        key: `note-${n.id}`,
        kind: "note",
        icon: StickyNote,
        title: n.body.length > 90 ? n.body.slice(0, 90) + "…" : n.body,
        detail: "Note added",
        at: n.created_at,
        actor: n.author || "Team",
        tone: eventTone.note,
      });
    }

    blocks.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());

    let prev = "00000000";
    return blocks.map((b, i) => {
      const hash = shortHash(`${prev}|${b.kind}|${b.title}|${b.at}|${b.actor}`);
      const block = { ...b, index: i + 1, hash, prev };
      prev = hash;
      return block;
    });
  }, [candidate, applications, events, transcripts, evaluations, notes, positions, locations]);


  return (
    <div className="space-y-5">
      {/* Applications / requisition history */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-emerald" /> Requisitions & applications</h4>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setShowAssign((s) => !s)}>
            <ArrowRightLeft className="h-3 w-3" /> Assign / reassign
          </Button>
        </div>

        {showAssign && (
          <div className="mb-3 rounded-xl border border-emerald/25 bg-emerald/[0.05] p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">Move this candidate to another store/role. Their current and past applications are kept for history.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Office</Label>
                <select value={newLoc} onChange={(e) => { setNewLoc(e.target.value); setNewPos(""); }} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Requisition</Label>
                <select value={newPos} onChange={(e) => setNewPos(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locPositions.map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button size="sm" className="h-8 bg-emerald text-primary-foreground hover:bg-emerald/90" onClick={doReassign} disabled={reassign.isPending}>
                {reassign.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />} Confirm move
              </Button>
            </div>
          </div>
        )}

        {loadingApps ? (
          <p className="text-[11px] text-muted-foreground">Loading…</p>
        ) : applications.length === 0 ? (
          <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border/60 p-4 text-center">No requisition assignments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {applications.map((a) => {
              const pos = posInfo(a.position_id);
              const meta = stageMeta(a.stage);
              return (
                <div key={a.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {pos ? `${pos.req_code ? pos.req_code + " · " : ""}${pos.title}` : "Unassigned requisition"}
                        {a.is_primary && <span className="ml-2 text-[9px] uppercase tracking-wide text-emerald inline-flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> current</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {locName(a.location_id)} · {a.source || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono uppercase" style={{ color: `hsl(${meta.hsl})` }}>{meta.label}</span>
                      <p className="text-[9px] text-muted-foreground">{relativeTime(a.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div>
        <h4 className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5 mb-2"><History className="h-3.5 w-3.5 text-emerald" /> Activity timeline</h4>
        {loadingEvents ? (
          <p className="text-[11px] text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border/60 p-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="relative pl-4 space-y-3 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
            {events.map((e) => {
              const tone = eventTone[e.event_type] || "180 10% 60%";
              return (
                <div key={e.id} className="relative">
                  <span className="absolute -left-[13px] top-1 h-2 w-2 rounded-full ring-2 ring-card" style={{ background: `hsl(${tone})` }} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground">{e.title || prettyStatus(e.event_type)}</p>
                      <p className="text-[10px] text-muted-foreground">{prettyStatus(e.event_type)}{e.actor ? ` · ${e.actor}` : ""}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {relativeTime(e.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
