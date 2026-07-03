import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Eye, Loader2, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Candidate, useCandidateSignals, useAnalyzeCandidateSignals, CandidateSignal } from "@/hooks/useRecruiting";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  candidate: Candidate;
}

const SEV_HSL: Record<string, string> = {
  low: "190 90% 45%",
  medium: "40 90% 52%",
  high: "0 75% 58%",
};

const RISK_HSL: Record<string, string> = {
  unknown: "215 16% 55%",
  low: "150 70% 42%",
  medium: "40 90% 52%",
  high: "0 75% 58%",
};

const SEV_LABEL: Record<string, string> = { low: "Low", medium: "Med", high: "High" };

export default function CandidateSignals({ candidate }: Props) {
  const { profile } = useAuth();
  const { data: signals, isLoading } = useCandidateSignals(candidate.id);
  const analyze = useAnalyzeCandidateSignals();
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = () => {
    analyze.mutate({ candidateId: candidate.id, evaluatorName: profile?.full_name || profile?.email || "AI" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signals) {
    return (
      <div className="text-center py-10 space-y-4 animate-rise">
        <div className="mx-auto h-12 w-12 rounded-full bg-holo/12 grid place-items-center text-holo">
          <Eye className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Signal Scanner</h3>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
            Analyzes the résumé and notes for patterns a human might miss — job gaps, short tenures, trajectory oddities — and suggests targeted interview questions.
          </p>
        </div>
        <Button onClick={run} disabled={analyze.isPending} className="bg-holo text-primary-foreground hover:bg-holo/90 gap-1.5">
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {analyze.isPending ? "Scanning…" : "Run Scan"}
        </Button>
      </div>
    );
  }

  const riskHsl = RISK_HSL[signals.risk_level] || RISK_HSL.unknown;
  const list: CandidateSignal[] = Array.isArray(signals.signals) ? signals.signals : [];

  return (
    <div className="space-y-4 animate-rise">
      {/* Header / risk summary */}
      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="h-14 w-14 rounded-full grid place-items-center shrink-0" style={{ background: `hsl(${riskHsl} / 0.14)`, color: `hsl(${riskHsl})` }}>
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wide rounded-full px-2 py-0.5" style={{ color: `hsl(${riskHsl})`, background: `hsl(${riskHsl} / 0.14)` }}>
              {signals.risk_level.toUpperCase()} RISK
            </span>
            <span className="text-[10px] text-muted-foreground">· {list.length} finding{list.length !== 1 ? "s" : ""}</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-1 leading-snug">{signals.headline || "No headline"}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{signals.summary || "—"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={run} disabled={analyze.isPending} className="shrink-0 gap-1">
          {analyze.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Re-scan
        </Button>
      </div>

      {/* Signals */}
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No notable patterns detected. Always follow up on anything unclear.</p>
      ) : (
        <div className="space-y-2">
          {list.map((s, idx) => {
            const key = `${s.title}-${idx}`;
            const sev = s.severity || "low";
            const hsl = SEV_HSL[sev] || SEV_HSL.low;
            const open = expanded === key;
            return (
              <div key={key} className="glass-panel rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(open ? null : key)} className="w-full text-left p-3.5 flex items-center gap-3 tap-target">
                  <span className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: `hsl(${hsl} / 0.14)`, color: `hsl(${hsl})` }}>
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{s.title}</span>
                      <span className="text-[8px] font-mono uppercase rounded-full px-1.5 py-0.5" style={{ color: `hsl(${hsl})`, background: `hsl(${hsl} / 0.14)` }}>
                        {SEV_LABEL[sev]}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{s.category}</p>
                  </div>
                  {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3 animate-rise border-t border-border/50 pt-3">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">Observation</span>
                      <p className="text-[11px] text-foreground/90 mt-0.5">{s.observation}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">Why it matters</span>
                      <p className="text-[11px] text-foreground/90 mt-0.5">{s.why_it_matters}</p>
                    </div>
                    {(s.questions || []).length > 0 && (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase text-holo"><HelpCircle className="h-3 w-3" /> Questions to ask</span>
                        <ul className="mt-1 space-y-1">
                          {s.questions.map((q, qi) => (
                            <li key={qi} className="flex items-start gap-1.5 text-[11px] text-foreground/85">
                              <span className="text-holo shrink-0">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground text-center">
        Analyzed by {signals.generated_by || "AI"} using <span className="font-mono">{signals.model}</span> on {new Date(signals.updated_at || signals.created_at).toLocaleString()}
      </p>
    </div>
  );
}
