import { Candidate, getPhaseProgress } from "@/hooks/useCandidates";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const phaseLabels: Record<number, string> = {
  1: "Requisition Ready",
  2: "Offer Sent",
  3: "Docs Returned",
  4: "Background Check",
  5: "Clearances",
  6: "ADP Registration",
  7: "NVO",
  8: "Cleared to Start",
};

const milestones = [
  { key: "offer_packet_sent", label: "Offer Sent" },
  { key: "offer_packet_returned", label: "Offer Returned" },
  { key: "ids_received", label: "IDs Received" },
  { key: "background_check_sent", label: "BG Check Sent" },
  { key: "background_check_complete", label: "BG Check Done" },
  { key: "mandated_reporter_complete", label: "Mandated Reporter" },
  { key: "adp_registration_complete", label: "ADP Done" },
  { key: "nvo_complete", label: "NVO Done" },
] as const;

interface Props {
  candidate: Candidate;
  onClick?: () => void;
}

export default function CandidateProgressBar({ candidate, onClick }: Props) {
  const progress = getPhaseProgress(candidate);
  const phase = candidate.current_phase;

  const getGradient = () => {
    if (progress >= 90) return "from-success to-success/80";
    if (progress >= 60) return "from-accent to-accent/80";
    if (progress >= 30) return "from-warning to-warning/80";
    return "from-phase-5 to-phase-5/80";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="w-full text-left group cursor-pointer touch-manipulation"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground truncate mr-2">
              {candidate.candidate_name}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 sm:h-2.5 w-full rounded-full bg-secondary/80 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
            {/* Phase tick marks */}
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <div
                key={p}
                className="absolute top-0 h-full w-px bg-background/40"
                style={{ left: `${(p / 8) * 100}%` }}
              />
            ))}
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate mr-2">
              {candidate.position}
              <span className="lg:hidden"> · {candidate.region}</span>
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {phaseLabels[phase]}
            </span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
        <p className="font-semibold text-sm">{candidate.candidate_name}</p>
        <p className="text-xs text-muted-foreground">{candidate.position} · {candidate.site}</p>
        <div className="space-y-0.5 pt-1">
          {milestones.map((m) => {
            const done = !!(candidate as unknown as Record<string, unknown>)[m.key];
            return (
              <div key={m.key} className="flex items-center gap-2 text-xs">
                <span className={done ? "text-success" : "text-muted-foreground/50"}>
                  {done ? "✓" : "○"}
                </span>
                <span className={done ? "text-foreground" : "text-muted-foreground"}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
        {candidate.blocker_notes && (
          <div className="pt-1 border-t border-border">
            <p className="text-[10px] text-warning font-medium">⚠ {candidate.blocker_notes}</p>
          </div>
        )}
        <p className="text-[10px] text-accent pt-1">Tap to open full details →</p>
      </TooltipContent>
    </Tooltip>
  );
}
