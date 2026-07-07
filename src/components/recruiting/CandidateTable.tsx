import { useMemo, useState } from "react";
import {
  MoreHorizontal, Eye, Pencil, ArrowRightLeft, MessageSquarePlus, ClipboardCheck,
  ArrowUpRight, Archive, FileText, Filter, ExternalLink,
} from "lucide-react";
import {
  Candidate, Location, Position, useUpdateCandidate,
} from "@/hooks/useRecruiting";
import {
  STAGES, stageMeta, initials, relativeTime, SOURCES, SCREENING_STATUS, INTERVIEW_STATUS, prettyStatus,
} from "@/lib/recruiting";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  candidates: Candidate[];
  locations: Location[];
  positions: Position[];
  onOpen: (c: Candidate, tab?: string) => void;
}

const statusTone: Record<string, string> = {
  passed: "160 84% 46%",
  completed: "160 84% 46%",
  in_progress: "210 100% 64%",
  scheduled: "197 100% 60%",
  failed: "4 73% 60%",
  not_started: "180 8% 55%",
};

export default function CandidateTable({ candidates, locations, positions, onOpen }: Props) {
  const updateCandidate = useUpdateCandidate();
  const [fStage, setFStage] = useState("All");
  const [fSource, setFSource] = useState("All");
  const [fPosition, setFPosition] = useState("All");
  const [fScreen, setFScreen] = useState("All");
  const [fInterview, setFInterview] = useState("All");

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name || "—";
  const posLabel = (id: string | null) => {
    const p = positions.find((x) => x.id === id);
    return p ? `${p.req_code ? p.req_code + " · " : ""}${p.title}` : "—";
  };

  const rows = useMemo(() => {
    return candidates.filter((c) => {
      if (fStage !== "All" && c.stage !== fStage) return false;
      if (fSource !== "All" && c.source !== fSource) return false;
      if (fPosition !== "All" && c.position_id !== fPosition) return false;
      if (fScreen !== "All" && (c.screening_status || "not_started") !== fScreen) return false;
      if (fInterview !== "All" && (c.interview_status || "not_started") !== fInterview) return false;
      return true;
    });
  }, [candidates, fStage, fSource, fPosition, fScreen, fInterview]);

  const save = (id: string, updates: Partial<Candidate>) => updateCandidate.mutate({ id, ...updates });

  const StatusPill = ({ value }: { value: string }) => {
    const v = value || "not_started";
    const hsl = statusTone[v] || statusTone.not_started;
    return <span className="text-[10px] font-medium" style={{ color: `hsl(${hsl})` }}>{prettyStatus(v)}</span>;
  };

  const cellSelect = "h-8 rounded-md border border-input bg-background px-1.5 text-xs";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <select value={fStage} onChange={(e) => setFStage(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <select value={fPosition} onChange={(e) => setFPosition(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-card/60 max-w-[180px]">
          <option value="All">All requisitions</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
        </select>
        <select value={fSource} onChange={(e) => setFSource(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fScreen} onChange={(e) => setFScreen(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">Any screening</option>
          {SCREENING_STATUS.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
        </select>
        <select value={fInterview} onChange={(e) => setFInterview(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">Any interview</option>
          {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground">{rows.length} candidate{rows.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60 glass-panel">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Candidate</th>
              <th className="px-2 py-2.5 font-medium">Office</th>
              <th className="px-2 py-2.5 font-medium">Requisition</th>
              <th className="px-2 py-2.5 font-medium">Stage</th>
              <th className="px-2 py-2.5 font-medium">Screening</th>
              <th className="px-2 py-2.5 font-medium">Interview</th>
              <th className="px-2 py-2.5 font-medium">Source</th>
              <th className="px-2 py-2.5 font-medium">Added</th>
              <th className="px-2 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const loc = locations.find((l) => l.id === c.location_id);
              const meta = stageMeta(c.stage);
              return (
                <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 align-middle">
                    <button onClick={() => onOpen(c)} className="flex items-center gap-2.5 text-left group">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ background: `hsl(${meta.hsl} / 0.18)`, color: `hsl(${meta.hsl})` }}>{initials(c.full_name)}</span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground truncate max-w-[160px] group-hover:text-emerald">{c.full_name}</span>
                        <span className="block text-[10px] text-muted-foreground truncate max-w-[160px]">{c.headline || c.applied_role || "—"}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select value={c.location_id || ""} onChange={(e) => { const l = locations.find((x) => x.id === e.target.value); save(c.id, { location_id: e.target.value || null, region: l?.region || c.region }); }} className={`${cellSelect} w-28`}>
                      <option value="">—</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select value={c.position_id || ""} onChange={(e) => { const p = positions.find((x) => x.id === e.target.value); save(c.id, { position_id: e.target.value || null, ...(p ? { applied_role: p.title } : {}) }); }} className={`${cellSelect} w-40`}>
                      <option value="">—</option>
                      {positions.filter((p) => !c.location_id || p.location_id === c.location_id).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select value={c.stage} onChange={(e) => save(c.id, { stage: e.target.value })} className={`${cellSelect} w-28`} style={{ color: `hsl(${meta.hsl})` }}>
                      {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select value={c.screening_status || "not_started"} onChange={(e) => save(c.id, { screening_status: e.target.value })} className={`${cellSelect} w-28`}>
                      {SCREENING_STATUS.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <select value={c.interview_status || "not_started"} onChange={(e) => save(c.id, { interview_status: e.target.value })} className={`${cellSelect} w-28`}>
                      {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle text-[11px] text-muted-foreground whitespace-nowrap">{c.source || "—"}</td>
                  <td className="px-2 py-2 align-middle text-[11px] text-muted-foreground whitespace-nowrap">{relativeTime(c.created_at)}</td>
                  <td className="px-2 py-2 align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="tap-target text-muted-foreground hover:text-foreground p-1"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onOpen(c)}><Eye className="h-3.5 w-3.5 mr-2" /> View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpen(c, "details")}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpen(c, "history")}><ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Assign / history</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpen(c, "notes")}><MessageSquarePlus className="h-3.5 w-3.5 mr-2" /> Add note</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpen(c, "scorecards")}><ClipboardCheck className="h-3.5 w-3.5 mr-2" /> Evaluate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {c.resume_url ? (
                          <DropdownMenuItem onClick={() => window.open(c.resume_url, "_blank")}><FileText className="h-3.5 w-3.5 mr-2" /> Open résumé</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled><FileText className="h-3.5 w-3.5 mr-2" /> No résumé</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onOpen(c, "details")} className="text-destructive focus:text-destructive"><Archive className="h-3.5 w-3.5 mr-2" /> Reject / archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-xs text-muted-foreground">No candidates match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
