import { useState, useMemo } from "react";
import { Search, Filter, Users, Clock, CheckCircle2, AlertTriangle, ArrowUpDown } from "lucide-react";
import { useCandidates, Candidate, getPhaseProgress } from "@/hooks/useCandidates";
import AddCandidateDialog from "./AddCandidateDialog";
import CandidateProgressBar from "./CandidateProgressBar";
import CandidateDetailSheet from "./CandidateDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

const phaseBgMap: Record<number, string> = {
  1: "bg-phase-1/15 text-phase-1",
  2: "bg-phase-2/15 text-phase-2",
  3: "bg-phase-3/15 text-phase-3",
  4: "bg-phase-4/15 text-phase-4",
  5: "bg-phase-5/15 text-phase-5",
  6: "bg-phase-6/15 text-phase-6",
  7: "bg-phase-7/15 text-phase-7",
  8: "bg-phase-8/15 text-phase-8",
};

export default function CommandCenter() {
  const { data: candidates = [], isLoading } = useCandidates();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "phase" | "progress">("phase");

  const filtered = useMemo(() => {
    let result = candidates.filter((c) => {
      const matchSearch =
        !search ||
        c.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
        c.position.toLowerCase().includes(search.toLowerCase()) ||
        c.requisition_id.toLowerCase().includes(search.toLowerCase()) ||
        c.site.toLowerCase().includes(search.toLowerCase());
      const matchRegion = regionFilter === "All" || c.region === regionFilter;
      const matchPhase = phaseFilter === null || c.current_phase === phaseFilter;
      return matchSearch && matchRegion && matchPhase;
    });

    result.sort((a, b) => {
      if (sortBy === "name") return a.candidate_name.localeCompare(b.candidate_name);
      if (sortBy === "progress") return getPhaseProgress(b) - getPhaseProgress(a);
      return a.current_phase - b.current_phase;
    });

    return result;
  }, [candidates, search, regionFilter, phaseFilter, sortBy]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const active = candidates.filter((c) => c.current_phase < 8).length;
    const cleared = candidates.filter((c) => c.current_phase === 8).length;
    const blocked = candidates.filter((c) => c.blocker_notes.trim()).length;
    return { total, active, cleared, blocked };
  }, [candidates]);

  const openCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setSheetOpen(true);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Command Center</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Add, track, and manage all candidates through the hiring pipeline.
          </p>
        </div>
        <AddCandidateDialog />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Candidates", value: stats.total, icon: Users, color: "text-accent" },
          { label: "Active Pipeline", value: stats.active, icon: Clock, color: "text-warning" },
          { label: "Cleared to Start", value: stats.cleared, icon: CheckCircle2, color: "text-success" },
          { label: "With Blockers", value: stats.blocked, icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates, positions, sites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-full"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-input bg-card text-foreground"
        >
          <option value="All">All Regions</option>
          <option value="DC">DC</option>
          <option value="Maryland">Maryland</option>
          <option value="Virginia">Virginia</option>
          <option value="Virtual">Virtual</option>
        </select>
        <select
          value={phaseFilter ?? ""}
          onChange={(e) => setPhaseFilter(e.target.value ? Number(e.target.value) : null)}
          className="h-9 px-3 text-sm rounded-lg border border-input bg-card text-foreground"
        >
          <option value="">All Phases</option>
          {Object.entries(phaseLabels).map(([k, v]) => (
            <option key={k} value={k}>Phase {k}: {v}</option>
          ))}
        </select>
        <button
          onClick={() => setSortBy(sortBy === "phase" ? "progress" : sortBy === "progress" ? "name" : "phase")}
          className="h-9 px-3 text-sm rounded-lg border border-input bg-card text-foreground flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortBy === "phase" ? "By Phase" : sortBy === "progress" ? "By Progress" : "By Name"}
        </button>
      </div>

      {/* Progress bars grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No candidates yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Add Candidate" to get started — upload a PA form or enter details manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Phase badge */}
                <div className="pt-1">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold ${phaseBgMap[c.current_phase]}`}>
                    {c.current_phase}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <CandidateProgressBar candidate={c} onClick={() => openCandidate(c)} />
                </div>

                {/* Region + site */}
                <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{c.region}</Badge>
                  <span className="text-[10px] text-muted-foreground">{c.site}</span>
                </div>
              </div>

              {c.blocker_notes && (
                <div className="mt-2 ml-13 pl-[52px]">
                  <p className="text-[11px] text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {c.blocker_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Candidate detail sheet */}
      <CandidateDetailSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
