import { useMemo, useState } from "react";
import { Briefcase, Plus, MapPin, Users, Flame, Loader2, Filter, Link2, ExternalLink, Trash2, Globe } from "lucide-react";
import { usePositions, useCandidates, useLocations, useCreatePosition, useUpdatePosition, Position, PostingLocation } from "@/hooks/useRecruiting";
import { REGIONS, PRIORITIES, POSITION_STATUS, stageMeta, initials } from "@/lib/recruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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
  const [form, setForm] = useState({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "", posting_url: "" });

  // Postings + description editor state
  const [postOpen, setPostOpen] = useState(false);
  const [postPos, setPostPos] = useState<Position | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [postLocs, setPostLocs] = useState<PostingLocation[]>([]);
  const [postDesc, setPostDesc] = useState("");
  const [postReq, setPostReq] = useState("");

  const filtered = useMemo(() => positions.filter((p) => region === "All" || p.region === region), [positions, region]);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name;
  const candForPos = (id: string) => candidates.filter((c) => c.position_id === id && c.status === "active");

  const submit = async () => {
    if (!form.title.trim()) return;
    const loc = locations.find((l) => l.id === form.location_id);
    await createPosition.mutateAsync({ ...form, region: loc?.region || "", status: "open", posting_locations: [] });
    setForm({ title: "", location_id: "", department: "", employment_type: "Full-time", openings: 1, priority: "normal", pay_range: "", requirements: "", description: "", posting_url: "" });
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
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Open Positions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Every requisition with live candidate counts and where each role is posted.</p>
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
            const postLocsList = Array.isArray(p.posting_locations) ? p.posting_locations : [];
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
