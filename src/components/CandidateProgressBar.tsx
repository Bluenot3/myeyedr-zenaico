import { Candidate, getPhaseProgress } from "@/hooks/useCandidates";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AlertTriangle, CheckCircle2, Circle, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  { key: "offer_packet_sent", label: "Offer Packet Sent", phase: 2, icon: "📤" },
  { key: "offer_packet_returned", label: "Offer Returned", phase: 3, icon: "📥" },
  { key: "ids_received", label: "IDs Received", phase: 3, icon: "🪪" },
  { key: "background_check_sent", label: "BG Check Sent", phase: 4, icon: "🔍" },
  { key: "background_check_complete", label: "BG Check Done", phase: 4, icon: "✅" },
  { key: "mandated_reporter_complete", label: "Mandated Reporter", phase: 5, icon: "📋" },
  { key: "adp_registration_sent", label: "ADP Sent", phase: 6, icon: "📧" },
  { key: "adp_registration_complete", label: "ADP Complete", phase: 6, icon: "✅" },
  { key: "nvo_complete", label: "NVO Complete", phase: 7, icon: "🎓" },
] as const;

interface Props {
  candidate: Candidate;
  onClick?: () => void;
}

export default function CandidateProgressBar({ candidate, onClick }: Props) {
  const progress = getPhaseProgress(candidate);
  const phase = candidate.current_phase;
  const completedMilestones = milestones.filter(
    (m) => !!(candidate as unknown as Record<string, unknown>)[m.key]
  ).length;
  const totalMilestones = milestones.length;

  // Calculate days in pipeline
  const createdDate = new Date(candidate.created_at);
  const now = new Date();
  const daysInPipeline = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="w-full text-left group cursor-pointer touch-manipulation"
        >
          {/* Name and stats row */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {candidate.candidate_name}
              </span>
              {candidate.blocker_notes && (
                <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {completedMilestones}/{totalMilestones}
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: `hsl(var(--phase-${phase}))` }}>
                {progress}%
              </span>
            </div>
          </div>

          {/* Segmented phase bar */}
          <div className="flex gap-[2px] h-3 sm:h-3.5 w-full">
            {Array.from({ length: 8 }, (_, i) => {
              const phaseNum = i + 1;
              const isCompleted = phaseNum < phase;
              const isCurrent = phaseNum === phase;
              const isFuture = phaseNum > phase;

              // For current phase, calculate intra-phase progress
              let fillPercent = 0;
              if (isCompleted) fillPercent = 100;
              else if (isCurrent) {
                // Roughly calculate based on milestones in this phase
                const phaseMs = milestones.filter((m) => m.phase === phaseNum);
                if (phaseMs.length === 0) fillPercent = 50;
                else {
                  const done = phaseMs.filter(
                    (m) => !!(candidate as unknown as Record<string, unknown>)[m.key]
                  ).length;
                  fillPercent = Math.round((done / phaseMs.length) * 100);
                }
              }

              return (
                <div
                  key={phaseNum}
                  className={`flex-1 rounded-sm overflow-hidden relative ${
                    isFuture ? "bg-secondary/60" : "bg-secondary/80"
                  }`}
                >
                  {/* Fill */}
                  <div
                    className="absolute inset-0 rounded-sm transition-all duration-700 ease-out"
                    style={{
                      width: `${fillPercent}%`,
                      backgroundColor: `hsl(var(--phase-${phaseNum}))`,
                      opacity: isFuture ? 0.15 : isCompleted ? 0.85 : 0.7,
                    }}
                  />

                  {/* Current phase pulse indicator */}
                  {isCurrent && fillPercent < 100 && (
                    <div
                      className="absolute right-0 top-0 h-full w-[3px] animate-pulse rounded-r-sm"
                      style={{ backgroundColor: `hsl(var(--phase-${phaseNum}))` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom labels */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground truncate mr-2">
              {candidate.position}
              <span className="lg:hidden"> · {candidate.region}</span>
            </span>
            <span
              className="text-[10px] font-medium whitespace-nowrap"
              style={{ color: `hsl(var(--phase-${phase}))` }}
            >
              P{phase}: {phaseLabels[phase]}
            </span>
          </div>
        </button>
      </HoverCardTrigger>

      {/* Rich hover card */}
      <HoverCardContent side="bottom" align="start" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-border"
          style={{ background: `linear-gradient(135deg, hsl(var(--phase-${phase}) / 0.1), transparent)` }}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">{candidate.candidate_name}</h4>
            <Badge
              variant="outline"
              className="text-[10px] border-current"
              style={{ color: `hsl(var(--phase-${phase}))` }}
            >
              Phase {phase}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{candidate.position} · {candidate.site}</p>
        </div>

        {/* Stats row */}
        <div className="flex border-b border-border divide-x divide-border">
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-lg font-bold font-display text-foreground">{progress}%</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Complete</p>
          </div>
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-lg font-bold font-display text-foreground">{completedMilestones}/{totalMilestones}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Milestones</p>
          </div>
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-lg font-bold font-display text-foreground">{daysInPipeline}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Days</p>
          </div>
        </div>

        {/* Milestone checklist */}
        <div className="px-3 py-2.5 space-y-1 max-h-48 overflow-y-auto">
          {milestones.map((m) => {
            const done = !!(candidate as unknown as Record<string, unknown>)[m.key];
            const isCurrent = m.phase === phase && !done;
            return (
              <div
                key={m.key}
                className={`flex items-center gap-2 text-xs py-0.5 rounded px-1 ${
                  isCurrent ? "bg-accent/5" : ""
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                ) : isCurrent ? (
                  <Clock className="h-3.5 w-3.5 text-accent shrink-0 animate-pulse" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                )}
                <span className="mr-1">{m.icon}</span>
                <span className={done ? "text-foreground" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground/50"}>
                  {m.label}
                </span>
                <span className="text-[9px] text-muted-foreground ml-auto">P{m.phase}</span>
              </div>
            );
          })}
        </div>

        {/* Blocker warning */}
        {candidate.blocker_notes && (
          <div className="px-3 py-2 bg-warning/5 border-t border-warning/20">
            <p className="text-[10px] text-warning font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{candidate.blocker_notes}</span>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <p className="text-[10px] text-accent font-medium flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Click to open full details & documents →
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
