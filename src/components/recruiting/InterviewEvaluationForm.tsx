import { useMemo, useRef, useState } from "react";
import { Check, Save, X, Download, Loader2 } from "lucide-react";
import {
  Candidate, ScorecardTemplate, CandidateEvaluation, Competency,
  useCreateEvaluation, useUpdateEvaluation,
} from "@/hooks/useRecruiting";
import "./interview-form.css";

interface Props {
  candidate: Candidate;
  template: ScorecardTemplate;
  eventId?: string | null;
  evaluatorName: string;
  existing?: CandidateEvaluation | null;
  onDone: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  0: "Red Flag", 1: "Concern", 2: "Mixed", 3: "Good", 4: "Excellent",
};

const VIEWS = [
  { key: "full", label: "Full" },
  { key: "quick", label: "Quick" },
  { key: "scoring", label: "Score Guide" },
  { key: "redflags", label: "Red Flags" },
] as const;

const RISK_AREAS: Record<string, string[]> = {
  interview: ["Technology", "Patient service", "Reliability", "Accuracy", "Team fit"],
  phone_screen: ["Communication", "Availability", "Reliability", "Motivation", "Professionalism"],
  scorecard: ["Skill", "Reliability", "Culture fit"],
};

function recFromRatio(ratio: number): string {
  if (ratio >= 0.85) return "Strong Hire";
  if (ratio >= 0.70) return "Hireable";
  if (ratio >= 0.55) return "Borderline";
  return "No Hire";
}

const REC_KEY: Record<string, string> = {
  "Strong Hire": "strong_yes", "Hireable": "yes", "Borderline": "neutral", "No Hire": "no",
};

export default function InterviewEvaluationForm({ candidate, template, eventId, evaluatorName, existing, onDone }: Props) {
  const createEval = useCreateEvaluation();
  const updateEval = useUpdateEvaluation();
  const comps: Competency[] = template.competencies || [];
  const isPhone = template.kind === "phone_screen";
  const riskAreas = RISK_AREAS[template.kind] || RISK_AREAS.scorecard;

  const seedScores: Record<string, number> = {};
  const seedNotes: Record<string, string> = {};
  (existing?.ratings || []).forEach((r) => {
    if (r.score !== undefined && r.score !== null) seedScores[r.id] = r.score;
    if (r.comment) seedNotes[r.id] = r.comment;
  });

  const [scores, setScores] = useState<Record<string, number | undefined>>(seedScores);
  const [notes, setNotes] = useState<Record<string, string>>(seedNotes);
  const [risks, setRisks] = useState<Record<string, string>>(existing?.details?.risks || {});
  const [finalDecision, setFinalDecision] = useState(existing?.details?.finalDecision || "");
  const [bestReason, setBestReason] = useState(existing?.details?.bestReason || "");
  const [biggestConcern, setBiggestConcern] = useState(existing?.details?.biggestConcern || "");
  const [trainingPriority, setTrainingPriority] = useState(existing?.details?.trainingPriority || "");
  const [managerInitials, setManagerInitials] = useState(existing?.details?.managerInitials || "");
  const [location, setLocation] = useState(existing?.details?.location || "");
  const [interviewDate, setInterviewDate] = useState(existing?.details?.interviewDate || new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<string>("full");
  const [pdfBusy, setPdfBusy] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const downloadPdf = async () => {
    const node = shellRef.current;
    if (!node) return;
    setPdfBusy(true);
    const prevView = view;
    try {
      // Force the full reference view so every question/anchor is captured.
      setView("full");
      await new Promise((r) => setTimeout(r, 60));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: Math.max(node.scrollWidth, 1100),
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL("image/png");
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      const safeName = candidate.full_name.replace(/[^a-z0-9]+/gi, "_");
      const kindLabel = isPhone ? "Phone_Screen" : "Interview";
      pdf.save(`${safeName}_${kindLabel}_Evaluation.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setView(prevView);
      setPdfBusy(false);
    }
  };

  const { total, completed, maxTotal, percent, recLabel } = useMemo(() => {
    const scored = comps.filter((c) => scores[c.id] !== undefined);
    const total = scored.reduce((s, c) => s + Number(scores[c.id] || 0), 0);
    const maxTotal = comps.length * 4;
    const completed = scored.length;
    const percent = comps.length ? Math.round((completed / comps.length) * 100) : 0;
    const ratio = maxTotal ? total / maxTotal : 0;
    return { total, completed, maxTotal, percent, recLabel: completed === 0 ? "Not Scored" : recFromRatio(ratio) };
  }, [scores, comps]);

  const badge = completed === 0 ? "Ready" : completed < Math.ceil(comps.length / 2) ? "In Progress"
    : completed < comps.length ? "Halfway+" : "Complete";

  const setScore = (id: string, v: number) => setScores((s) => ({ ...s, [id]: v }));
  const setNote = (id: string, v: string) => setNotes((n) => ({ ...n, [id]: v }));

  const save = async () => {
    const ratings = comps.map((c) => ({
      id: c.id, label: c.title || c.label,
      score: scores[c.id] ?? 0, comment: notes[c.id] || "",
    }));
    const overall = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
    const details = {
      kind: template.kind, scale: 4, total, maxTotal, recLabel,
      risks, finalDecision, bestReason, biggestConcern, trainingPriority,
      managerInitials, location, interviewDate,
    };
    const payload: any = {
      candidate_id: candidate.id,
      template_id: template.id,
      event_id: eventId || null,
      position_id: candidate.position_id,
      template_name: template.name,
      evaluator: evaluatorName,
      ratings,
      overall_score: overall,
      recommendation: REC_KEY[recLabel] || "",
      notes: bestReason,
      details,
      submitted: true,
    };
    if (existing?.id) {
      await updateEval.mutateAsync({ id: existing.id, candidate_id: candidate.id, ...payload });
    } else {
      await createEval.mutateAsync(payload);
    }
    onDone();
  };

  const saving = createEval.isPending || updateEval.isPending;

  return (
    <div className="iform" data-view={view}>
      <div className="app-shell">
        {/* Header */}
        <section className="top-card">
          <div className="brand-line">
            <div className="logo-text">MyEyeDr</div>
            <div className="title-stack">
              <h1>{isPhone ? "Phone Screen Evaluation" : "Interview Evaluation Form"}</h1>
              <p>{template.role || candidate.applied_role} · Interactive scorecard · Evaluator: <b>{evaluatorName}</b></p>
            </div>
          </div>
          <div className="header-actions">
            <div className="phi-pill">Do not record PHI</div>
            <button className="mini-btn orange" type="button" onClick={onDone}>
              <X className="inline h-3.5 w-3.5 -mt-0.5" /> Close
            </button>
          </div>
        </section>

        {/* Candidate */}
        <section className="candidate-card">
          <div className="candidate-grid">
            <div className="field">
              <label>Candidate</label>
              <input value={candidate.full_name} readOnly />
            </div>
            <div className="field">
              <label>Position</label>
              <input value={candidate.applied_role || template.role} readOnly />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / market" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Interviewer(s)</label>
              <input value={evaluatorName} readOnly />
            </div>
          </div>
        </section>

        {/* Game bar */}
        <section className="game-bar">
          <div className="score-scale">
            <div>Scoring Scale</div>
            <div><strong>0</strong> Red Flag</div>
            <div><strong>1</strong> Concern</div>
            <div><strong>2</strong> Mixed</div>
            <div><strong>3</strong> Good</div>
            <div><strong>4</strong> Excellent</div>
          </div>
          <div className="progress-card">
            <div className="progress-top">
              <div className="progress-title">Completion</div>
              <div className="badge">{badge}</div>
            </div>
            <div className="meter-wrap">
              <div className="meter-track"><div className="meter-fill" style={{ width: `${percent}%` }} /></div>
              <div className="score-big">{completed}/{comps.length}</div>
            </div>
          </div>
          <div className="mode-card">
            <div className="mode-title">Question Reference View</div>
            <div className="mode-switcher">
              {VIEWS.map((v) => (
                <button key={v.key} type="button" className={view === v.key ? "active" : ""} onClick={() => setView(v.key)}>{v.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Table header */}
        <section className="table-header" aria-hidden>
          <div>#</div><div>Competency / Area</div><div>Interview Questions</div><div>Score</div><div>Notes / Evidence</div>
        </section>

        {/* Rows */}
        <section className="quest-list">
          {comps.map((c, i) => {
            const s = scores[c.id];
            const scored = s !== undefined;
            return (
              <article key={c.id} className={`quest-row${scored ? " completed" : ""}`}>
                <div className="cell">{i + 1}</div>
                <div className="cell competency">
                  <h3>{c.title || c.label}</h3>
                  {c.area && <div className="area-pill">Area: {c.area}</div>}
                  {(c.evidence || c.guidance) && <p>{c.evidence || c.guidance}</p>}
                  <div className="complete-mark"><Check className="h-3 w-3" /> Scored</div>
                </div>
                <div className="cell question-cell">
                  <div className="question-panel">
                    <div className="mode-pane full">
                      <div className="q-title"><span>Ask either question</span><span className="tiny-chip">A/B choice</span></div>
                      <div className="question-list">
                        {c.q1 && <div className="question-item"><b>A.</b> {c.q1}</div>}
                        {c.q2 && <div className="question-item"><b>B.</b> {c.q2}</div>}
                        {!c.q1 && !c.q2 && c.guidance && <div className="question-item">{c.guidance}</div>}
                      </div>
                      {c.lookFor && <div className="look-for"><b>Listen for:</b> {c.lookFor}</div>}
                    </div>
                    <div className="mode-pane quick">
                      <div className="q-title"><span>Quick script</span><span className="tiny-chip">Fast view</span></div>
                      {c.quick && <div className="question-item">{c.quick}</div>}
                      {c.q1 && <div className="question-item"><b>Fallback ask:</b> {c.q1}</div>}
                    </div>
                    <div className="mode-pane scoring">
                      <div className="q-title"><span>Scoring anchor</span><span className="tiny-chip">0-4 guide</span></div>
                      {c.anchors && <div className="anchor-box">{c.anchors}</div>}
                      <div className="look-for"><b>Evidence to write down:</b> concrete example, exact action taken, outcome, and whether they owned the result.</div>
                    </div>
                    <div className="mode-pane redflags">
                      <div className="q-title"><span>No-hire watch</span><span className="tiny-chip">Risk view</span></div>
                      {c.redFlags && <div className="red-box">{c.redFlags}</div>}
                    </div>
                  </div>
                </div>
                <div className="cell score-cell">
                  <div className="score-options" role="radiogroup" aria-label={`Score ${c.title || c.label}`}>
                    {[0, 1, 2, 3, 4].map((v) => (
                      <label key={v} className="score-option" title={`${v} = ${SCORE_LABELS[v]}`}>
                        <input type="radio" name={`score_${c.id}`} value={v} checked={s === v} onChange={() => setScore(c.id, v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                  <div className={`score-label-live${scored ? ` s${s}` : ""}`}>
                    {scored ? `${s} · ${SCORE_LABELS[s as number]}` : "Not scored"}
                  </div>
                </div>
                <div className="cell notes-cell">
                  <textarea className="notes" value={notes[c.id] || ""} onChange={(e) => setNote(c.id, e.target.value)}
                    placeholder="Write evidence, exact examples, concerns, and follow-up notes..." />
                  <p className="notes-help">Tip: write what they actually said, not a vibe.</p>
                </div>
              </article>
            );
          })}
        </section>

        {/* Summary + Risk */}
        <section className="footer-panels">
          <div className="summary-panel">
            <div className="total-score">Total: {total} / {maxTotal}</div>
            <div className="interp"><strong>Interpretation:</strong><br />≥85% Strong Hire · ≥70% Hireable · ≥55% Borderline · below No Hire</div>
            <div className="recommendation-pill">Recommendation: {recLabel}</div>
          </div>
          <div className="risk-panel">
            <div className="risk-title">Risk Check</div>
            <div className="risk-grid">
              {riskAreas.map((area) => (
                <div key={area} className="risk-item">
                  <label>{area}</label>
                  <div className="risk-options">
                    {["L", "M", "H"].map((v) => (
                      <label key={v}>
                        <input type="radio" name={`risk_${area}`} value={v} checked={risks[area] === v}
                          onChange={() => setRisks((r) => ({ ...r, [area]: v }))} /> {v}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!isPhone && (
          <section className="watchout-panel">
            <h3>Automatic No-Hire Watchouts</h3>
            <p>Poor patient temperament; guessing on insurance, billing, scheduling, authorizations, eligibility, or records; confidentiality risk; defensiveness; weak reliability; no correction system; discomfort with phones, technology, repetition, details, interruptions, or teamwork.</p>
          </section>
        )}

        {/* Decision */}
        <section className="decision-panel">
          <div className="decision-grid">
            <div>
              <div className="decision-title">Final Decision</div>
              <div className="decision-options">
                {["Move Forward", "Hold", "Do Not Move Forward"].map((v) => (
                  <label key={v}>
                    <input type="radio" name="finalDecision" value={v} checked={finalDecision === v} onChange={() => setFinalDecision(v)} /> {v}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="decision-title">Best reason to move forward</label>
              <textarea value={bestReason} onChange={(e) => setBestReason(e.target.value)} placeholder="Strengths, evidence, upside..." />
            </div>
            <div>
              <label className="decision-title">Biggest concern</label>
              <textarea value={biggestConcern} onChange={(e) => setBiggestConcern(e.target.value)} placeholder="Risk, gap, uncertainty..." />
            </div>
            <div>
              <label className="decision-title">{isPhone ? "Follow-up / next step" : "Training priority if hired"}</label>
              <textarea value={trainingPriority} onChange={(e) => setTrainingPriority(e.target.value)} placeholder={isPhone ? "Schedule interview, references, timing..." : "First 30-day focus..."} />
            </div>
          </div>
          <div className="manager-final">
            <div />
            <div className="field">
              <label>Evaluator Initials</label>
              <input value={managerInitials} onChange={(e) => setManagerInitials(e.target.value)} placeholder="Initials" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="form-actions">
          <span className="live">{candidate.full_name} · {total}/{maxTotal} · {recLabel}</span>
          <button className="mini-btn" type="button" onClick={onDone}>Cancel</button>
          <button className="mini-btn primary" type="button" onClick={save} disabled={completed === 0 || saving}>
            <Save className="inline h-3.5 w-3.5 -mt-0.5" /> {saving ? "Saving…" : existing?.id ? "Update Evaluation" : "Save Evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}
