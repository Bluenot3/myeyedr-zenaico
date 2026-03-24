import { useState, useMemo } from "react";
import {
  Search, Users, Clock, CheckCircle2, AlertTriangle, ArrowUpDown,
  CheckSquare, Square, Zap, Plus, ChevronDown, Settings,
} from "lucide-react";
import { useCandidates, Candidate, getPhaseProgress, useBulkUpdateCandidates, computePhase } from "@/hooks/useCandidates";
import AddCandidateDialog from "./AddCandidateDialog";
import CandidateProgressBar from "./CandidateProgressBar";
import CandidateDetailSheet from "./CandidateDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

const bulkMilestones = [
  { key: "offer_packet_sent", label: "Mark Offer Sent" },
  { key: "offer_packet_returned", label: "Mark Offer Returned" },
  { key: "ids_received", label: "Mark IDs Received" },
  { key: "background_check_sent", label: "Mark BG Check Sent" },
  { key: "background_check_complete", label: "Mark BG Check Complete" },
  { key: "mandated_reporter_complete", label: "Mark Mandated Reporter" },
  { key: "adp_registration_sent", label: "Mark ADP Sent" },
  { key: "adp_registration_complete", label: "Mark ADP Complete" },
  { key: "nvo_complete", label: "Mark NVO Complete" },
] as const;

interface Props {
  onOpenAdmin: () => void;
}

export default function CommandCenter({ onOpenAdmin }: Props) {
  const { data: candidates = [], isLoading } = useCandidates();
  const bulkUpdate = useBulkUpdateCandidates();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "phase" | "progress">("phase");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleBulkAction = async (key: string) => {
    if (selectedIds.size === 0) {
      toast.error("Select candidates first");
      return;
    }
    const ids = Array.from(selectedIds);
    
    // Compute new phase for each
    const updates: Partial<Candidate> = { [key]: true };
    
    // For each selected candidate, compute what the new phase should be
    for (const id of ids) {
      const candidate = candidates.find((c) => c.id === id);
      if (candidate) {
        const merged = { ...candidate, ...updates };
        const newPhase = computePhase(merged);
        await bulkUpdate.mutateAsync({
          ids: [id],
          updates: { ...updates, current_phase: newPhase },
        });
      }
    }
    setSelectedIds(new Set());
  };

  const openCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setSheetOpen(true);
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Command Center
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Your hiring pipeline at a glance. Tap any candidate to manage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onOpenAdmin} className="h-9 w-9" title="Admin Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <AddCandidateDialog />
          </div>
        </div>
      </div>

      {/* Stats cards — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-accent" },
          { label: "Active", value: stats.active, icon: Clock, color: "text-warning" },
          { label: "Cleared", value: stats.cleared, icon: CheckCircle2, color: "text-success" },
          { label: "Blocked", value: stats.blocked, icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card rounded-lg border border-border p-3 sm:p-4 flex items-center gap-2.5 min-w-[120px] shrink-0 sm:shrink sm:min-w-0"
          >
            <div className={`p-1.5 sm:p-2 rounded-lg bg-muted ${s.color}`}>
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-display font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates, positions, sites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="h-9 px-3 text-xs sm:text-sm rounded-lg border border-input bg-card text-foreground flex-1 min-w-0 sm:flex-none sm:w-auto"
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
            className="h-9 px-3 text-xs sm:text-sm rounded-lg border border-input bg-card text-foreground flex-1 min-w-0 sm:flex-none sm:w-auto"
          >
            <option value="">All Phases</option>
            {Object.entries(phaseLabels).map(([k, v]) => (
              <option key={k} value={k}>P{k}: {v}</option>
            ))}
          </select>
          <button
            onClick={() => setSortBy(sortBy === "phase" ? "progress" : sortBy === "progress" ? "name" : "phase")}
            className="h-9 px-3 text-xs sm:text-sm rounded-lg border border-input bg-card text-foreground flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span className="hidden sm:inline">{sortBy === "phase" ? "By Phase" : sortBy === "progress" ? "By Progress" : "By Name"}</span>
            <span className="sm:hidden">{sortBy === "phase" ? "Phase" : sortBy === "progress" ? "%" : "A-Z"}</span>
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
          >
            {selectedIds.size === filtered.length ? (
              <CheckSquare className="h-4 w-4 text-accent" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {hasSelection ? `${selectedIds.size} selected` : "Select all"}
            </span>
            <span className="sm:hidden">
              {hasSelection ? selectedIds.size : "All"}
            </span>
          </button>

          {hasSelection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Zap className="h-3 w-3" /> Bulk Action <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {bulkMilestones.map((m) => (
                  <DropdownMenuItem key={m.key} onClick={() => handleBulkAction(m.key)}>
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Candidate list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 sm:p-12 text-center">
          <Users className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium text-sm sm:text-base">
            {candidates.length === 0 ? "No candidates yet" : "No matches"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {candidates.length === 0
              ? "Tap \"Add Candidate\" to get started."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-card rounded-lg border border-border p-3 sm:p-4 hover:shadow-md active:shadow-sm transition-shadow touch-manipulation"
            >
              <div className="flex items-start gap-2 sm:gap-4">
                {/* Select checkbox */}
                <button
                  onClick={() => toggleSelect(c.id)}
                  className="pt-1.5 shrink-0 touch-manipulation"
                >
                  {selectedIds.has(c.id) ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </button>

                {/* Phase badge */}
                <div className="pt-0.5 shrink-0">
                  <span className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-bold ${phaseBgMap[c.current_phase]}`}>
                    {c.current_phase}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <CandidateProgressBar candidate={c} onClick={() => openCandidate(c)} />
                </div>

                {/* Region badge — desktop only */}
                <div className="hidden lg:flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{c.region}</Badge>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{c.site}</span>
                </div>
              </div>

              {c.blocker_notes && (
                <div className="mt-1.5 pl-[56px] sm:pl-[68px]">
                  <p className="text-[10px] sm:text-[11px] text-warning flex items-center gap-1 truncate">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.blocker_notes}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CandidateDetailSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
