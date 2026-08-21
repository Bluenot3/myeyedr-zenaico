import { useEffect, useMemo, useState } from "react";
import { Search, CheckSquare, Zap, ChevronDown, Sparkles, Users, Lock, Briefcase, MapPin, Eye, EyeOff } from "lucide-react";
import { useCandidates, useLocations, usePositions, useBulkUpdateCandidates, Candidate } from "@/hooks/useRecruiting";
import { useAuth } from "@/hooks/useAuth";
import { STAGES, stageMeta, stageProgress, stageIndex } from "@/lib/recruiting";
import CandidateCard from "./CandidateCard";
import CandidateProfile from "./CandidateProfile";
import CandidateTable from "./CandidateTable";
import AddCandidateDialog from "./AddCandidateDialog";
import BulkResumeUpload from "./BulkResumeUpload";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type ViewMode = "board" | "list" | "table";

const CLOSED_STATUSES = new Set(["closed", "filled"]);
const REQ_KEY = "cc.pipeline.req";

export default function PipelineBoard() {
  const { data: candidates = [], isLoading } = useCandidates();
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();
  const bulkUpdate = useBulkUpdateCandidates();
  const { hasAllAccess } = useAuth();

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<string>("match");
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("board");
  const [reqId, setReqId] = useState<string>(() => localStorage.getItem(REQ_KEY) || "all");
  const [showClosedReqs, setShowClosedReqs] = useState(false);

  useEffect(() => { localStorage.setItem(REQ_KEY, reqId); }, [reqId]);

  const openReqs = useMemo(() => positions.filter((p) => !CLOSED_STATUSES.has(p.status)), [positions]);
  const closedReqs = useMemo(() => positions.filter((p) => CLOSED_STATUSES.has(p.status)), [positions]);
  const visibleReqs = useMemo(() => (showClosedReqs ? [...openReqs, ...closedReqs] : openReqs), [openReqs, closedReqs, showClosedReqs]);

  const activeReq = useMemo(() => positions.find((p) => p.id === reqId) || null, [positions, reqId]);
  const isClosedPipeline = !!activeReq && CLOSED_STATUSES.has(activeReq.status);

  // If a selected requisition disappears (no access / deleted), fall back to all.
  useEffect(() => {
    if (reqId !== "all" && positions.length > 0 && !positions.some((p) => p.id === reqId)) setReqId("all");
  }, [reqId, positions]);

  // Closed pipelines are read-only — drop any pending selection.
  useEffect(() => { if (isClosedPipeline) setIds(new Set()); }, [isClosedPipeline]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const s = !search || [c.full_name, c.applied_role, c.headline, c.email].some((f) => f.toLowerCase().includes(search.toLowerCase()));
      const r = region === "All" || c.region === region;
      const q = reqId === "all" || c.position_id === reqId;
      return s && r && q;
    });
  }, [candidates, search, region, reqId]);

  const regionOptions = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.region).filter(Boolean))),
    [candidates]
  );

  const byStage = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    STAGES.forEach((s) => (map[s.key] = []));
    filtered.forEach((c) => { if (map[c.stage]) map[c.stage].push(c); });
    return map;
  }, [filtered]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;
  const openCandidate = (c: Candidate, tab: string = "match") => { setSelected(c); setProfileTab(tab); setOpen(true); };

  const toggle = (id: string) => setIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setIds(new Set());


  const bulkAdvance = async () => {
    const list = candidates.filter((c) => ids.has(c.id));
    for (const c of list) {
      const next = STAGES[Math.min(STAGES.length - 1, stageIndex(c.stage) + 1)];
      await bulkUpdate.mutateAsync({ ids: [c.id], updates: { stage: next.key, score: Math.max(c.score, stageProgress(next.key)) } });
    }
    clearSel();
  };
  const bulkStage = async (stageKey: string) => {
    await bulkUpdate.mutateAsync({ ids: Array.from(ids), updates: { stage: stageKey, score: stageProgress(stageKey) } });
    clearSel();
  };
  const bulkPool = async () => {
    await bulkUpdate.mutateAsync({ ids: Array.from(ids), updates: { in_talent_pool: true } });
    clearSel();
  };

  const hasSel = ids.size > 0;

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Candidate Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Move applicants through each stage · click a card for the full profile & ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkResumeUpload />
          <AddCandidateDialog compact />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates…" className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card/60 focus:outline-none focus:ring-2 focus:ring-emerald/40" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 px-3 text-xs rounded-lg border border-input bg-card/60">
            <option value="All">All Regions</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button onClick={() => setView("board")} className={`px-3 h-9 text-xs ${view === "board" ? "bg-emerald/15 text-emerald" : "text-muted-foreground"}`}>Board</button>
            <button onClick={() => setView("list")} className={`px-3 h-9 text-xs ${view === "list" ? "bg-emerald/15 text-emerald" : "text-muted-foreground"}`}>List</button>
            <button onClick={() => setView("table")} className={`px-3 h-9 text-xs ${view === "table" ? "bg-emerald/15 text-emerald" : "text-muted-foreground"}`}>Table</button>
          </div>
          {hasSel && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">{ids.size} selected</span>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={bulkAdvance}><Zap className="h-3 w-3" /> Advance</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">Set stage <ChevronDown className="h-3 w-3" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Move to…</DropdownMenuLabel>
                  {STAGES.map((s) => <DropdownMenuItem key={s.key} onClick={() => bulkStage(s.key)}>{s.label}</DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={bulkPool}><Sparkles className="h-3.5 w-3.5 mr-1.5 text-gold" /> Add to talent pool</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={clearSel} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {STAGES.map((s) => (
            <div key={s.key} className="w-72 shrink-0">
              <div className="mb-2 px-1 rounded-lg border border-border/50 bg-card/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${s.hsl})` }} />
                  <span className="text-xs font-mono uppercase tracking-wide" style={{ color: `hsl(${s.hsl})` }}>{s.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">{byStage[s.key].length}</span>
                </div>
                {s.action && <p className="mt-1.5 text-[11px] font-medium text-foreground/90 leading-snug">{s.action}</p>}
                {s.done && (
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground leading-snug">
                    <CheckSquare className="h-2.5 w-2.5 mt-[1px] shrink-0" style={{ color: `hsl(${s.hsl})` }} />
                    <span><span className="uppercase tracking-wide text-[8px] mr-1" style={{ color: `hsl(${s.hsl})` }}>Done when</span>{s.done}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2 min-h-[60px]">
                {byStage[s.key].map((c) => (
                  <CandidateCard key={c.id} candidate={c} locationName={locName(c.location_id)} onOpen={() => openCandidate(c)} onEvaluate={() => openCandidate(c, "scorecards")} selectable selected={ids.has(c.id)} onToggleSelect={() => toggle(c.id)} />
                ))}
                {byStage[s.key].length === 0 && <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-[10px] text-muted-foreground">Empty</div>}
              </div>
            </div>
          ))}
        </div>
      ) : view === "table" ? (
        <CandidateTable candidates={filtered} locations={locations} positions={positions} onOpen={openCandidate} />
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="glass-panel rounded-xl p-10 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">No candidates match.</p>
            </div>
          )}
          {filtered.sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage)).map((c) => (
            <CandidateCard key={c.id} candidate={c} locationName={locName(c.location_id)} onOpen={() => openCandidate(c)} onEvaluate={() => openCandidate(c, "scorecards")} selectable selected={ids.has(c.id)} onToggleSelect={() => toggle(c.id)} />
          ))}
        </div>
      )}

      <CandidateProfile candidate={selected} open={open} onOpenChange={setOpen} initialTab={profileTab} />
    </div>
  );
}
