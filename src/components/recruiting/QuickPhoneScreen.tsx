import { forwardRef, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Check, Download, FileText, Image as ImageIcon, Loader2, Phone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Candidate, EvaluationRating, useAddBadge, useCreateEvaluation,
} from "@/hooks/useRecruiting";
import {
  QUICK_PHONE_CONFIRMATIONS, QUICK_PHONE_DIMENSIONS, QUICK_PHONE_FLAGS,
  QUICK_PHONE_TEMPLATE_NAME, QUICK_PHONE_VERDICTS,
} from "@/lib/evaluationBlueprints";
import { uploadCandidateFile } from "@/lib/storage";
import ScoreRing from "./ScoreRing";

interface Props {
  candidate: Candidate;
  eventId?: string | null;
  evaluatorName: string;
  onDone: () => void;
}

const SCALE = 5;
const SCALE_HINTS = ["Poor", "Weak", "OK", "Strong", "Excellent"];

const verdictMeta = (key: string) =>
  QUICK_PHONE_VERDICTS.find((v) => v.key === key) || { key: "", label: "Not decided", hsl: "215 16% 55%" };

const recFromVerdict = (verdict: string, score: number): string => {
  if (verdict === "advance") return score >= 85 ? "strong_yes" : "yes";
  if (verdict === "hold") return "neutral";
  if (verdict === "pool") return "no";
  if (verdict === "pass") return "strong_no";
  return "";
};

const safeName = (s: string) => (s || "candidate").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export default function QuickPhoneScreen({ candidate, eventId, evaluatorName, onDone }: Props) {
  const createEval = useCreateEvaluation();
  const addBadge = useAddBadge();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [standout, setStandout] = useState("");
  const [concern, setConcern] = useState("");
  const [verdict, setVerdict] = useState("");
  const [busy, setBusy] = useState<null | "png" | "pdf" | "save">(null);

  const printRef = useRef<HTMLDivElement>(null);
  const screenedOn = useMemo(() => new Date(), []);

  const ratedCount = QUICK_PHONE_DIMENSIONS.filter((d) => (scores[d.id] || 0) > 0).length;
  const score = useMemo(() => {
    const rated = QUICK_PHONE_DIMENSIONS.filter((d) => (scores[d.id] || 0) > 0);
    if (!rated.length) return 0;
    const total = rated.reduce((s, d) => s + scores[d.id], 0);
    return Math.round((total / (rated.length * SCALE)) * 100);
  }, [scores]);

  const toggleFlag = (f: string) =>
    setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  /* ------------------------------ export ------------------------------ */
  const renderCanvas = async () => {
    const node = printRef.current;
    if (!node) throw new Error("Card not ready");
    return html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  };

  const canvasToPdfBlob = (canvas: HTMLCanvasElement) => {
    const png = canvas.toDataURL("image/png");
    const margin = 24;
    const contentW = 612 - margin * 2;
    const ratio = contentW / canvas.width;
    const h = canvas.height * ratio;
    const pdf = new jsPDF({ unit: "pt", format: [612, h + margin * 2], orientation: "portrait" });
    pdf.addImage(png, "PNG", margin, margin, contentW, h);
    return pdf.output("blob") as Blob;
  };

  const baseName = `phone-screen-${safeName(candidate.full_name)}-${screenedOn.toISOString().slice(0, 10)}`;

  const download = async (kind: "png" | "pdf") => {
    setBusy(kind);
    try {
      const canvas = await renderCanvas();
      const blob = kind === "png"
        ? await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/png"))
        : canvasToPdfBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.${kind}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (e: any) {
      toast.error("Export failed: " + (e?.message || "unknown error"));
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------- save ------------------------------- */
  const save = async () => {
    if (ratedCount === 0) return;
    setBusy("save");
    let pdfUrl = "";
    let pngUrl = "";
    try {
      const canvas = await renderCanvas();
      const pngBlob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/png"));
      const pdfBlob = canvasToPdfBlob(canvas);
      const [png, pdf] = await Promise.all([
        uploadCandidateFile(new File([pngBlob], `${baseName}.png`, { type: "image/png" })),
        uploadCandidateFile(new File([pdfBlob], `${baseName}.pdf`, { type: "application/pdf" })),
      ]);
      pngUrl = png.url;
      pdfUrl = pdf.url;
    } catch (e: any) {
      toast.error("Card file could not be attached — the screen was still saved. " + (e?.message || ""));
    }

    const ratings: EvaluationRating[] = QUICK_PHONE_DIMENSIONS.map((d) => ({
      id: d.id,
      label: d.label,
      score: scores[d.id] || 0,
      comment: "",
    }));
    const v = verdictMeta(verdict);

    try {
      await createEval.mutateAsync({
        candidate_id: candidate.id,
        template_id: null,
        event_id: eventId || null,
        position_id: candidate.position_id,
        template_name: QUICK_PHONE_TEMPLATE_NAME,
        evaluator: evaluatorName,
        ratings: ratings as any,
        overall_score: score,
        recommendation: recFromVerdict(verdict, score),
        notes: [standout && `Stood out: ${standout}`, concern && `Concern: ${concern}`].filter(Boolean).join(" · "),
        details: {
          kind: "phone_screen",
          quick: true,
          scale: SCALE,
          recLabel: v.label,
          confirmations,
          flags,
          standout,
          concern,
          verdict,
          pdfUrl,
          pngUrl,
        } as any,
        submitted: true,
      });

      await addBadge.mutateAsync({
        candidate_id: candidate.id,
        badge_type: "phone_screen",
        title: `${QUICK_PHONE_TEMPLATE_NAME} — ${v.label}`,
        score,
        summary: [standout, concern && `Concern: ${concern}`].filter(Boolean).join(" · ") || `${ratedCount}/6 rated by ${evaluatorName}`,
        detail: { verdict, flags, confirmations, pdfUrl, pngUrl, scale: SCALE },
        file_url: pdfUrl,
        issued_by: evaluatorName,
      });
      onDone();
    } catch {
      /* mutation hooks surface their own errors */
    } finally {
      setBusy(null);
    }
  };

  const v = verdictMeta(verdict);
  const locationLabel = candidate.region || "—";
  const dateLabel = screenedOn.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <ScoreRing score={score} size={54} stroke={5} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-emerald" /> Quick Phone Screen
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {candidate.full_name} · {candidate.applied_role || "—"} · {locationLabel} · {dateLabel} · {evaluatorName}
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wide rounded-full px-2 py-1 bg-muted text-muted-foreground shrink-0">
          {ratedCount} of {QUICK_PHONE_DIMENSIONS.length} rated
        </span>
      </div>

      {/* Six judgments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {QUICK_PHONE_DIMENSIONS.map((d, i) => {
          const s = scores[d.id] || 0;
          return (
            <div key={d.id} className="rounded-xl border border-border/60 bg-background/40 p-3.5">
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 grid place-items-center rounded-full bg-emerald/12 text-emerald text-[10px] font-bold shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{d.label}</p>
                  <p className="text-[11px] text-foreground/70 mt-1 leading-relaxed">“{d.prompt}”</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{d.lookFor}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScores((cur) => ({ ...cur, [d.id]: cur[d.id] === n ? 0 : n }))}
                    aria-label={`${d.label}: ${n} of 5 — ${SCALE_HINTS[n - 1]}`}
                    className="tap-target flex-1 rounded-lg border py-2 text-[11px] font-semibold transition-all"
                    style={{
                      color: s >= n ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                      background: s >= n ? "hsl(var(--emerald))" : "transparent",
                      borderColor: s >= n ? "hsl(var(--emerald))" : "hsl(var(--border))",
                    }}
                  >
                    {n}
                  </button>
                ))}
                <span className="w-16 text-right text-[10px] text-muted-foreground shrink-0">{s ? SCALE_HINTS[s - 1] : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmations + flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
          <Label className="text-[10px]">Confirmed on the call</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_PHONE_CONFIRMATIONS.map((c) => {
              const on = !!confirmations[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => setConfirmations((cur) => ({ ...cur, [c.id]: !cur[c.id] }))}
                  className="tap-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    color: on ? "hsl(var(--emerald))" : "hsl(var(--muted-foreground))",
                    background: on ? "hsl(var(--emerald) / 0.12)" : "transparent",
                    borderColor: on ? "hsl(var(--emerald) / 0.5)" : "hsl(var(--border))",
                  }}
                >
                  <Check className="h-3 w-3" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
          <Label className="text-[10px]">Red flags heard</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_PHONE_FLAGS.map((f) => {
              const on = flags.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggleFlag(f)}
                  className="tap-target rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    color: on ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
                    background: on ? "hsl(var(--destructive) / 0.12)" : "transparent",
                    borderColor: on ? "hsl(var(--destructive) / 0.45)" : "hsl(var(--border))",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <div>
          <Label className="text-[10px]">One thing that stood out</Label>
          <Input value={standout} onChange={(e) => setStandout(e.target.value)} placeholder="Optional — a quote or a moment" className="mt-1 h-10 text-sm" />
        </div>
        <div>
          <Label className="text-[10px]">One concern</Label>
          <Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Optional — what to probe in the interview" className="mt-1 h-10 text-sm" />
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded-xl border border-border/60 bg-background/40 p-3.5">
        <Label className="text-[10px]">Verdict</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
          {QUICK_PHONE_VERDICTS.map((opt) => {
            const active = verdict === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setVerdict(opt.key)}
                className="tap-target rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all"
                style={{
                  color: active ? `hsl(${opt.hsl})` : "hsl(var(--muted-foreground))",
                  background: active ? `hsl(${opt.hsl} / 0.14)` : "transparent",
                  borderColor: active ? `hsl(${opt.hsl} / 0.5)` : "hsl(var(--border))",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={!!busy}>Cancel</Button>
        <Button variant="outline" className="gap-1.5" onClick={() => download("png")} disabled={!!busy}>
          {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} PNG
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => download("pdf")} disabled={!!busy}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
        </Button>
        <Button onClick={save} disabled={ratedCount === 0 || !!busy} className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save & attach to file
        </Button>
      </div>

      {/* Off-screen printable card */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none", opacity: 0 }} aria-hidden>
        <PrintCard
          ref={printRef}
          candidate={candidate}
          evaluatorName={evaluatorName}
          dateLabel={dateLabel}
          locationLabel={locationLabel}
          scores={scores}
          score={score}
          confirmations={confirmations}
          flags={flags}
          standout={standout}
          concern={concern}
          verdictLabel={v.label}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Printable card — plain hex colors so exports render identically   */
/* ---------------------------------------------------------------- */

interface PrintProps {
  candidate: Candidate;
  evaluatorName: string;
  dateLabel: string;
  locationLabel: string;
  scores: Record<string, number>;
  score: number;
  confirmations: Record<string, boolean>;
  flags: string[];
  standout: string;
  concern: string;
  verdictLabel: string;
}

const INK = "#0F1B2D";
const BLUE = "#1657E0";
const MUTED = "#5B6b82";
const LINE = "#DCE4F2";

const PrintCard = forwardRef<HTMLDivElement, PrintProps>(function PrintCard({
  candidate, evaluatorName, dateLabel, locationLabel, scores, score,
  confirmations, flags, standout, concern, verdictLabel,
}, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 780, background: "#ffffff", color: INK, padding: 32,
        fontFamily: "Manrope, Inter, system-ui, sans-serif", boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: BLUE, fontWeight: 700 }}>MyEyeDr · Phone Screen Record</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{candidate.full_name}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
            {[candidate.applied_role, locationLabel].filter((x) => x && x !== "—").join(" · ") || "Role not set"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: "48px", height: 48, color: BLUE }}>{score}</div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: MUTED, marginTop: 2, lineHeight: "14px" }}>Screen score</div>
          <div style={{ marginTop: 8, display: "inline-block", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>
            {verdictLabel}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, fontSize: 11, color: MUTED, marginTop: 10 }}>
        <span>Screened by <strong style={{ color: INK }}>{evaluatorName}</strong></span>
        <span>Date <strong style={{ color: INK }}>{dateLabel}</strong></span>
        {candidate.phone && <span>Phone <strong style={{ color: INK }}>{candidate.phone}</strong></span>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
        <tbody>
          {QUICK_PHONE_DIMENSIONS.map((d, i) => {
            const s = scores[d.id] || 0;
            return (
              <tr key={d.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td style={{ padding: "9px 0", fontSize: 13, fontWeight: 600, width: 300, verticalAlign: "middle" }}>
                  {i + 1}. {d.label}
                </td>
                <td style={{ padding: "9px 0", verticalAlign: "middle" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        style={{
                          width: 26, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
                          background: s >= n ? BLUE : "#F2F5FB",
                          color: s >= n ? "#ffffff" : "#AAB6CB",
                          border: `1px solid ${s >= n ? BLUE : LINE}`,
                        }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "9px 0", fontSize: 11, color: MUTED, textAlign: "right", width: 90 }}>
                  {s ? SCALE_HINTS[s - 1] : "not rated"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
        <div style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: MUTED, fontWeight: 700 }}>Confirmed on the call</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>
            {QUICK_PHONE_CONFIRMATIONS.map((c) => (
              <div key={c.id}>
                <span style={{ color: confirmations[c.id] ? BLUE : "#B9C4D6", fontWeight: 700, marginRight: 6 }}>
                  {confirmations[c.id] ? "✓" : "○"}
                </span>
                {c.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: MUTED, fontWeight: 700 }}>Red flags</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>
            {flags.length ? flags.map((f) => <div key={f}>• {f}</div>) : <div style={{ color: MUTED }}>None noted</div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, lineHeight: 1.7 }}>
        <div><strong>Stood out:</strong> {standout || <span style={{ color: MUTED }}>—</span>}</div>
        <div><strong>Concern:</strong> {concern || <span style={{ color: MUTED }}>—</span>}</div>
      </div>

      <div style={{ marginTop: 22, borderTop: `1px solid ${LINE}`, paddingTop: 10, fontSize: 9, color: MUTED, display: "flex", justifyContent: "space-between" }}>
        <span>Sealed to the candidate's chain of record · MyEyeDr Talent</span>
        <span>Powered by ZEN AI Co</span>
      </div>
    </div>
  );
});
