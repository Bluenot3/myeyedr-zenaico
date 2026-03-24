import { useState, useMemo } from "react";
import { useCandidates, Candidate, getPhaseProgress } from "@/hooks/useCandidates";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, Users, Filter } from "lucide-react";
import CandidateDetailSheet from "./CandidateDetailSheet";

const phases = [
  { num: 1, label: "Requisition", short: "REQ" },
  { num: 2, label: "Offer Sent", short: "OFR" },
  { num: 3, label: "Docs Returned", short: "DOC" },
  { num: 4, label: "Background", short: "BGC" },
  { num: 5, label: "Clearances", short: "CLR" },
  { num: 6, label: "ADP", short: "ADP" },
  { num: 7, label: "NVO", short: "NVO" },
  { num: 8, label: "Cleared", short: "CLR" },
];

const phaseGradients: Record<number, string> = {
  1: "from-phase-1/20 to-phase-1/5",
  2: "from-phase-2/20 to-phase-2/5",
  3: "from-phase-3/20 to-phase-3/5",
  4: "from-phase-4/20 to-phase-4/5",
  5: "from-phase-5/20 to-phase-5/5",
  6: "from-phase-6/20 to-phase-6/5",
  7: "from-phase-7/20 to-phase-7/5",
  8: "from-phase-8/20 to-phase-8/5",
};

const phaseDotColor: Record<number, string> = {
  1: "bg-phase-1",
  2: "bg-phase-2",
  3: "bg-phase-3",
  4: "bg-phase-4",
  5: "bg-phase-5",
  6: "bg-phase-6",
  7: "bg-phase-7",
  8: "bg-phase-8",
};

const regionColors: Record<string, string> = {
  DC: "bg-region-dc/15 text-region-dc border-region-dc/30",
  Maryland: "bg-region-md/15 text-region-md border-region-md/30",
  Virginia: "bg-region-va/15 text-region-va border-region-va/30",
  Virtual: "bg-region-virtual/15 text-region-virtual border-region-virtual/30",
};

export default function CandidateTimeline() {
  const { data: candidates = [], isLoading } = useCandidates();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState("All");

  const grouped = useMemo(() => {
    const filtered = regionFilter === "All"
      ? candidates
      : candidates.filter((c) => c.region === regionFilter);

    const map: Record<number, Candidate[]> = {};
    for (let i = 1; i <= 8; i++) map[i] = [];
    filtered.forEach((c) => map[c.current_phase]?.push(c));
    return map;
  }, [candidates, regionFilter]);

  const phaseCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 8; i++) counts[i] = grouped[i]?.length || 0;
    return counts;
  }, [grouped]);

  const openCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
            Onboarding Timeline
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Visual pipeline — see exactly where every candidate stands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-input bg-card text-foreground"
          >
            <option value="All">All Regions</option>
            <option value="DC">DC</option>
            <option value="Maryland">Maryland</option>
            <option value="Virginia">Virginia</option>
            <option value="Virtual">Virtual</option>
          </select>
        </div>
      </div>

      {/* Phase flow overview — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
        {phases.map((p, i) => (
          <div key={p.num} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${phaseDotColor[p.num]} flex items-center justify-center shadow-sm`}
              >
                <span className="text-xs sm:text-sm font-bold text-primary-foreground">{phaseCounts[p.num]}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </span>
            </div>
            {i < phases.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-border mx-0.5 sm:mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Timeline phases */}
      <div className="space-y-3">
        {phases.map((p) => {
          const group = grouped[p.num] || [];
          if (group.length === 0) return null;

          return (
            <div
              key={p.num}
              className={`rounded-xl border border-border overflow-hidden bg-gradient-to-r ${phaseGradients[p.num]}`}
            >
              {/* Phase header */}
              <div className="flex items-center gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-border/50">
                <div className={`w-7 h-7 rounded-lg ${phaseDotColor[p.num]} flex items-center justify-center`}>
                  <span className="text-xs font-bold text-primary-foreground">{p.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold font-display text-foreground">{p.label}</h3>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {group.length} {group.length === 1 ? "candidate" : "candidates"}
                </Badge>
              </div>

              {/* Candidate cards */}
              <div className="p-2 sm:p-3 space-y-1.5">
                {group.map((c) => {
                  const progress = getPhaseProgress(c);
                  return (
                    <button
                      key={c.id}
                      onClick={() => openCandidate(c)}
                      className="w-full text-left bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 p-2.5 sm:p-3 hover:shadow-md hover:border-border transition-all duration-200 touch-manipulation group"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Avatar circle */}
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${phaseDotColor[p.num]}/20 border-2 border-current flex items-center justify-center shrink-0`}
                          style={{ borderColor: `hsl(var(--phase-${p.num}))`, color: `hsl(var(--phase-${p.num}))` }}
                        >
                          <span className="text-[10px] sm:text-xs font-bold">{c.candidate_name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{c.candidate_name}</span>
                            {c.blocker_notes && (
                              <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground truncate">{c.position}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${regionColors[c.region] || "bg-muted text-muted-foreground"}`}>
                              {c.region}
                            </span>
                          </div>
                        </div>

                        {/* Mini progress */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-bold tabular-nums" style={{ color: `hsl(var(--phase-${p.num}))` }}>
                            {progress}%
                          </span>
                          <div className="w-16 sm:w-20 h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: `hsl(var(--phase-${p.num}))`,
                              }}
                            />
                          </div>
                        </div>

                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {candidates.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add candidates from the Pipeline tab to see them here.
            </p>
          </div>
        )}
      </div>

      <CandidateDetailSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
