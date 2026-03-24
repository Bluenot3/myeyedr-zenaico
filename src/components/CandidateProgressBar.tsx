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
  { key: "offer_packet_sent", label: "Offer Packet Sent" },
  { key: "offer_packet_returned", label: "Offer Packet Returned" },
  { key: "ids_received", label: "IDs Received" },
  { key: "background_check_sent", label: "Background Check Sent" },
  { key: "background_check_complete", label: "Background Check Complete" },
  { key: "mandated_reporter_complete", label: "Mandated Reporter" },
  { key: "adp_registration_complete", label: "ADP Registration" },
  { key: "nvo_complete", label: "NVO Complete" },
] as const;

interface Props {
  candidate: Candidate;
  onClick?: () => void;
}

export default function CandidateProgressBar({ candidate, onClick }: Props) {
  const progress = getPhaseProgress(candidate);
  const phase = candidate.current_phase;

  const getProgressColor = () => {
    if (progress >= 90) return "bg-success";
    if (progress >= 60) return "bg-accent";
    if (progress >= 30) return "bg-warning";
    return "bg-phase-5";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="w-full text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground truncate mr-2">
              {candidate.candidate_name}
            </span>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Phase {phase} · {progress}%
            </span>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
            {/* Phase markers */}
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <div
                key={p}
                className="absolute top-0 h-full w-px bg-background/60"
                style={{ left: `${(p / 8) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{candidate.position}</span>
            <span className="text-[10px] text-muted-foreground">{phaseLabels[phase]}</span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
        <p className="font-semibold text-sm">{candidate.candidate_name}</p>
        <p className="text-xs text-muted-foreground">{candidate.position} · {candidate.site}</p>
        <div className="space-y-1 pt-1">
          {milestones.map((m) => {
            const done = !!(candidate as unknown as Record<string, unknown>)[m.key];
            return (
              <div key={m.key} className="flex items-center gap-2 text-xs">
                <span className={done ? "text-success" : "text-muted-foreground"}>
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
      </TooltipContent>
    </Tooltip>
  );
}
