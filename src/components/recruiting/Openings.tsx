import { useMemo, useState } from "react";
import { Briefcase, Plus, MapPin, Users, Flame, Loader2, Filter, Link2, ExternalLink, Trash2, Globe, Search, CheckSquare, Square, Layers, ChevronDown, Lock } from "lucide-react";
import { usePositions, useCandidates, useLocations, useCreatePosition, useUpdatePosition, Position, PostingLocation } from "@/hooks/useRecruiting";
import { REGIONS, PRIORITIES, POSITION_STATUS, stageMeta, initials } from "@/lib/recruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import BestFitControl from "./BestFitControl";


const priorityColor: Record<string, string> = {
  urgent: "hsl(var(--destructive))",
  high: "hsl(var(--orange))",
  normal: "hsl(var(--holo))",
  low: "hsl(var(--muted-foreground))",
};
const statusColor: Record<string, string> = {
  open: "hsl(var(--emerald))",
  on_hold: "hsl(var(--gold))",
  filled: "hsl(var(--cyan))",
  closed: "hsl(var(--muted-foreground))",
};

export default function Openings() {
  const { data: positions = [], isLoading } = usePositions();
  const { data: candidates = [] } = useCandidates();
  const { data: locations = [] } = useLocations();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const [region, setRegion] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "", posting_url: "", hiring_manager: "" });

  // Postings + description editor state
  const [postOpen, setPostOpen] = useState(false);
  const [postPos, setPostPos] = useState<Position | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [postLocs, setPostLocs] = useState<PostingLocation[]>([]);
  const [postDesc, setPostDesc] = useState("");
  const [postReq, setPostReq] = useState("");

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "filled" | "closed" | "all">("active");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const inView = (status: string) =>
    view === "all" ? true
      : view === "active" ? status === "open" || status === "on_hold"
      : view === "filled" ? status === "filled"
      : status === "closed";

  const filtered = useMemo(
    () =>
      positions.filter((p) => {
        const r = region === "All" || p.region === region;
        const st = inView(p.status);
        const q =
          !search ||
          [p.title, p.req_code, p.department, p.hiring_manager, p.region]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(search.toLowerCase()));
        return r && st && q;
      }),
    [positions, region, view, search],
  );

  const summary = useMemo(() => {
    const count = (s: string) => positions.filter((p) => p.status === s).length;
    const openPos = positions.filter((p) => p.status === "open");
    return {
      reqs: positions.length,
      open: count("open"),
      hold: count("on_hold"),
      filled: count("filled"),
      closed: count("closed"),
      seats: openPos.reduce((n, p) => n + (p.openings || 1), 0),
    };
  }, [positions]);

  const toggleSel = (id: string) =>
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  const selectAllFiltered = () => setSel(new Set(filtered.map((p) => p.id)));
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => sel.has(p.id));

  /** Apply the same edit to every selected requisition in one sweep. */
  const bulkApply = async (updates: Partial<Position>, label: string) => {
    const ids = Array.from(sel);
    if (ids.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    try {
      for (const id of ids) {
        try { await updatePosition.mutateAsync({ id, ...updates } as any); ok++; } catch { /* keep sweeping */ }
      }
      ok === ids.length
        ? toast.success(`${label} · ${ok} requisition${ok === 1 ? "" : "s"}`)
        : toast.warning(`${label} · ${ok} of ${ids.length} updated`);
      if (ok) clearSel();
    } finally {
      setBulkBusy(false);
    }
  };

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;
  const candForPos = (id: string) => candidates.filter((c) => c.position_id === id && c.status === "active");
  const hiredForPos = (id: string) => candidates.filter((c) => c.position_id === id && c.stage === "hired").length;


  const submit = async () => {
    if (!form.title.trim()) return;
    const loc = locations.find((l) => l.id === form.location_id);
    await createPosition.mutateAsync({ ...form, region: loc?.region || "", status: "open", posting_locations: [] });
    setForm({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "", posting_url: "", hiring_manager: "" });
    setAddOpen(false);
  };

  const openPostings = (p: Position) => {
    setPostPos(p);
    setPostUrl(p.posting_url || "");
    setPostLocs(Array.isArray(p.posting_locations) ? [...p.posting_locations] : []);
    setPostDesc(p.description || "");
    setPostReq(p.requirements || "");
    setPostOpen(true);
  };
  const savePostings = async () => {
    if (!postPos) return;
    await updatePosition.mutateAsync({
      id: postPos.id,
      posting_url: postUrl.trim(),
      posting_locations: postLocs.filter((l) => l.label.trim() || l.url.trim()),
      description: postDesc.trim(),
      requirements: postReq.trim(),
    });
    setPostOpen(false);
  };

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Openings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {view === "active"
              ? "Roles you're actively hiring for. Filled and closed requisitions move to their own tabs."
              : view === "filled" ? "Requisitions whose seats are filled — kept for records."
              : view === "closed" ? "Closed requisitions, archived for reporting."
              : "Every requisition on record, in any state."}
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Opening</span></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-xl">Create Opening</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="sm:col-span-2"><Label className="text-[10px]">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="e.g. Patient Services Coordinator" /></div>
              <div><Label className="text-[10px]">Office</Label>
                <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">Select…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1" placeholder="Front Office…" /></div>
              <div><Label className="text-[10px]">Employment</Label>
                <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option>Full-time</option><option>Part-time</option><option>PRN</option>
                </select>
              </div>
              <div><Label className="text-[10px]">Priority</Label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]"># Openings</Label><Input type="number" value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} className="mt-1" /></div>
              <div><Label className="text-[10px]">Pay range</Label><Input value={form.pay_range} onChange={(e) => setForm({ ...form, pay_range: e.target.value })} className="mt-1" placeholder="$18–20/hr" /></div>
              <div className="sm:col-span-2"><Label className="text-[10px]">Hiring manager / owner</Label><Input value={form.hiring_manager} onChange={(e) => setForm({ ...form, hiring_manager: e.target.value })} className="mt-1" placeholder="Who owns this requisition?" /></div>
              <div className="sm:col-span-2"><Label className="text-[10px]">Primary posting URL</Label><Input value={form.posting_url} onChange={(e) => setForm({ ...form, posting_url: e.target.value })} className="mt-1" placeholder="https://indeed.com/…" /></div>
              <div className="sm:col-span-2"><Label className="text-[10px]">Requirements</Label><Input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label className="text-[10px]">Job description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[120px]" placeholder="Role summary, responsibilities, schedule, what makes a great fit…" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createPosition.isPending || !form.title.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">{createPosition.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        {[
          { label: "Requisitions", value: summary.reqs, tone: "hsl(var(--foreground))" },
          { label: "Open", value: summary.open, tone: statusColor.open },
          { label: "Open seats", value: summary.seats, tone: "hsl(var(--gold))" },
          { label: "On hold", value: summary.hold, tone: statusColor.on_hold },
          { label: "Filled / closed", value: summary.filled + summary.closed, tone: statusColor.closed },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl px-3.5 py-3 hover-lift transition-shadow">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
            <p className="font-display text-2xl font-bold leading-none mt-1.5 tabular-nums" style={{ color: s.tone }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* View tabs — filled roles never clutter the active list */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-border/70 bg-card/50 overflow-x-auto">
        {([
          { key: "active", label: "Hiring now", count: summary.open + summary.hold },
          { key: "filled", label: "Filled", count: summary.filled },
          { key: "closed", label: "Closed", count: summary.closed },
          { key: "all", label: "All", count: summary.reqs },
        ] as const).map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setView(t.key); clearSel(); }}
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all tap-target ${active ? "liquid-glass text-emerald border border-emerald/35 shadow-[0_0_18px_-10px_hsl(var(--emerald)/0.6)]" : "text-muted-foreground hover:text-foreground border border-transparent"}`}
            >
              {t.label} <span className="ml-1 tabular-nums opacity-70">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, req code, manager…"
            className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-input bg-card/60 focus:outline-none focus:ring-2 focus:ring-emerald/40"
          />
        </div>
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 px-3 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">All Regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => (allFilteredSelected ? clearSel() : selectAllFiltered())}
          className="h-9 px-3 text-xs rounded-lg border border-input bg-card/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          {allFilteredSelected ? <CheckSquare className="h-3.5 w-3.5 text-emerald" /> : <Square className="h-3.5 w-3.5" />}
          Select all ({filtered.length})
        </button>
      </div>


      {/* Bulk toolbar */}
      {sel.size > 0 && (
        <div className="sticky top-2 z-20 glass-panel rounded-xl border border-emerald/30 bg-emerald/[0.07] px-3 py-2.5 flex items-center gap-2 flex-wrap">
          <Layers className="h-4 w-4 text-emerald shrink-0" />
          <span className="text-xs font-semibold text-foreground">{sel.size} requisition{sel.size === 1 ? "" : "s"} selected</span>
          {bulkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" />}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={bulkBusy} className="h-8 gap-1 text-xs">Set status <ChevronDown className="h-3 w-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Move all to…</DropdownMenuLabel>
                {POSITION_STATUS.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => bulkApply({ status: s } as any, `Set to ${s.replace("_", " ")}`)}>
                    {s === "closed" || s === "filled" ? <Lock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> : <Briefcase className="h-3.5 w-3.5 mr-1.5 text-emerald" />}
                    {s.replace("_", " ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={bulkBusy} className="h-8 gap-1 text-xs">Priority <ChevronDown className="h-3 w-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Set priority</DropdownMenuLabel>
                {PRIORITIES.map((pr) => (
                  <DropdownMenuItem key={pr} onClick={() => bulkApply({ priority: pr } as any, `Priority → ${pr}`)}>{pr}</DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Seats per req</DropdownMenuLabel>
                {[1, 2, 3, 4].map((n) => (
                  <DropdownMenuItem key={n} onClick={() => bulkApply({ openings: n } as any, `Seats → ${n}`)}>{n} seat{n > 1 ? "s" : ""}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={clearSel} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        </div>
      )}


      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border-dashed border-border/70 py-14 px-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/12 border border-emerald/30">
            <Briefcase className="h-5 w-5 text-emerald" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {view === "active" ? "No roles are actively hiring" : view === "filled" ? "Nothing filled yet" : view === "closed" ? "No closed requisitions" : "No requisitions match"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {view === "active"
              ? "Every seat is either filled or closed. Open a new requisition to start a pipeline."
              : "Adjust the search, region, or switch tabs to see other requisitions."}
          </p>
          {view === "active" && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-4 gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> New opening</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const cands = candForPos(p.id);
            const hired = hiredForPos(p.id);
            const seatsFull = p.status === "open" && hired >= (p.openings || 1);
            const postLocsList = Array.isArray(p.posting_locations) ? p.posting_locations : [];

            return (
              <div
                key={p.id}
                className={`glass-panel rounded-xl p-4 hover-lift transition-shadow ${sel.has(p.id) ? "ring-1 ring-emerald/50 border-emerald/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleSel(p.id)}
                      aria-label={sel.has(p.id) ? `Deselect ${p.title}` : `Select ${p.title}`}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald"
                    >
                      {sel.has(p.id) ? <CheckSquare className="h-4 w-4 text-emerald" /> : <Square className="h-4 w-4" />}
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/30 shrink-0"><Briefcase className="h-4 w-4 text-emerald" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.req_code && <span className="text-[8.5px] font-mono uppercase tracking-wide text-emerald bg-emerald/10 border border-emerald/25 rounded px-1 py-0.5 shrink-0">{p.req_code}</span>}
                        <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {locName(p.location_id)} · {p.region}{p.hiring_manager ? ` · ${p.hiring_manager}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full" style={{ color: statusColor[p.status], background: `${statusColor[p.status]}20` }}>{p.status.replace("_", " ")}</span>
                    {(p.priority === "urgent" || p.priority === "high") && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" style={{ color: priorityColor[p.priority], background: `${priorityColor[p.priority]}20` }}><Flame className="h-2.5 w-2.5" />{p.priority}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                  <span>{p.employment_type}</span>
                  {p.pay_range && <span className="text-gold">{p.pay_range}</span>}
                  <span>· {hired}/{p.openings} seat{p.openings > 1 ? "s" : ""} filled</span>
                </div>

                {seatsFull && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/[0.08] px-2.5 py-2">
                    <Lock className="h-3.5 w-3.5 text-cyan shrink-0" />
                    <p className="text-[11px] text-foreground/90 flex-1">All seats are hired — move this out of Hiring now.</p>
                    <button
                      onClick={() => updatePosition.mutate({ id: p.id, status: "filled" })}
                      className="text-[10px] font-semibold text-cyan hover:underline whitespace-nowrap"
                    >
                      Mark filled
                    </button>
                  </div>
                )}


                {p.description ? (
                  <p className="mt-2.5 text-[11px] text-muted-foreground/90 leading-relaxed line-clamp-3">{p.description}</p>
                ) : (
                  <button onClick={() => openPostings(p)} className="mt-2.5 text-[10px] text-emerald hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add job description</button>
                )}



                {/* Postings */}
                <div className="mt-3 rounded-lg bg-background/40 border border-border/60 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="micro-label text-[9px] text-muted-foreground inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Posted on</span>
                    <button onClick={() => openPostings(p)} className="text-[9px] text-emerald hover:underline inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> Manage</button>
                  </div>
                  {p.posting_url || postLocsList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.posting_url && (
                        <a href={p.posting_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-emerald/12 text-emerald border border-emerald/30 hover:bg-emerald/20">
                          <ExternalLink className="h-2.5 w-2.5" /> Primary
                        </a>
                      )}
                      {postLocsList.map((l, i) => (
                        l.url ? (
                          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-holo/12 text-holo border border-holo/30 hover:bg-holo/20 max-w-[160px] truncate">
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">{l.label || "Posting"}</span>
                          </a>
                        ) : (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground border border-border max-w-[160px] truncate">{l.label || "Posting"}</span>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Not posted yet — click Manage to add links.</p>
                  )}
                </div>

                {/* Best-fit benchmark */}
                <BestFitControl position={p} candidates={candidates} />



                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="micro-label text-[9px] text-muted-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" /> {cands.length} candidate{cands.length !== 1 ? "s" : ""}</span>
                    <select value={p.status} onChange={(e) => updatePosition.mutate({ id: p.id, status: e.target.value })} className="h-7 px-2 text-[10px] rounded border border-input bg-background">
                      {POSITION_STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <div className="flex -space-x-2">
                    {cands.slice(0, 6).map((c) => (
                      <div key={c.id} title={c.full_name} className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-card" style={{ background: `hsl(${stageMeta(c.stage).hsl}/0.2)`, color: `hsl(${stageMeta(c.stage).hsl})` }}>{initials(c.full_name)}</div>
                    ))}
                    {cands.length === 0 && <span className="text-[10px] text-muted-foreground">No applicants yet</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Postings editor dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">Manage Role{postPos ? ` — ${postPos.title}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[10px]">Job description</Label>
              <Textarea value={postDesc} onChange={(e) => setPostDesc(e.target.value)} className="mt-1 min-h-[130px]" placeholder="Role summary, responsibilities, schedule, what makes a great fit…" />
            </div>
            <div>
              <Label className="text-[10px]">Requirements</Label>
              <Textarea value={postReq} onChange={(e) => setPostReq(e.target.value)} className="mt-1 min-h-[70px]" placeholder="Must-haves, certifications, availability…" />
            </div>
            <div>
              <Label className="text-[10px]">Primary posting URL</Label>
              <Input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} className="mt-1" placeholder="https://indeed.com/…" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px]">Every place it's posted</Label>
                <button onClick={() => setPostLocs([...postLocs, { label: "", url: "" }])} className="text-[10px] text-emerald hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
              </div>
              <div className="space-y-2">
                {postLocs.length === 0 && <p className="text-[10px] text-muted-foreground">Add each board or site where this role is live (Indeed, LinkedIn, ZipRecruiter, careers page…).</p>}
                {postLocs.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={l.label} onChange={(e) => { const n = [...postLocs]; n[i] = { ...n[i], label: e.target.value }; setPostLocs(n); }} className="w-32 shrink-0" placeholder="Indeed" />
                    <Input value={l.url} onChange={(e) => { const n = [...postLocs]; n[i] = { ...n[i], url: e.target.value }; setPostLocs(n); }} className="flex-1" placeholder="https://…" />
                    <button onClick={() => setPostLocs(postLocs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button onClick={savePostings} disabled={updatePosition.isPending} className="bg-emerald text-primary-foreground hover:bg-emerald/90">{updatePosition.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
