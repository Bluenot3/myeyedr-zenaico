import { useMemo, useState } from "react";
import { Briefcase, Plus, MapPin, Users, Flame, Loader2, Filter } from "lucide-react";
import { usePositions, useCandidates, useLocations, useCreatePosition, useUpdatePosition, Position } from "@/hooks/useRecruiting";
import { REGIONS, PRIORITIES, POSITION_STATUS, stageMeta, initials } from "@/lib/recruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [form, setForm] = useState({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "" });

  const filtered = useMemo(() => positions.filter((p) => region === "All" || p.region === region), [positions, region]);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;
  const candForPos = (id: string) => candidates.filter((c) => c.position_id === id && c.status === "active");

  const submit = async () => {
    if (!form.title.trim()) return;
    const loc = locations.find((l) => l.id === form.location_id);
    await createPosition.mutateAsync({ ...form, region: loc?.region || "", status: "open" });
    setForm({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "" });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Open Positions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Every requisition across the region, with live candidate counts.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Opening</span></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-xl">Create Opening</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="sm:col-span-2"><Label className="text-[10px]">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="e.g. Licensed Optician" /></div>
              <div><Label className="text-[10px]">Office</Label>
                <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">Select…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1" placeholder="Clinical / Retail…" /></div>
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
              <div><Label className="text-[10px]">Pay range</Label><Input value={form.pay_range} onChange={(e) => setForm({ ...form, pay_range: e.target.value })} className="mt-1" placeholder="$20–26/hr" /></div>
              <div className="sm:col-span-2"><Label className="text-[10px]">Requirements</Label><Input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createPosition.isPending || !form.title.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">{createPosition.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 px-3 text-xs rounded-lg border border-input bg-card/60">
          <option value="All">All Regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const cands = candForPos(p.id);
            return (
              <div key={p.id} className="glass-panel rounded-xl p-4 hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/30 shrink-0"><Briefcase className="h-4 w-4 text-emerald" /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {locName(p.location_id)} · {p.region}</p>
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
                  <span>· {p.openings} seat{p.openings > 1 ? "s" : ""}</span>
                </div>

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
    </div>
  );
}
