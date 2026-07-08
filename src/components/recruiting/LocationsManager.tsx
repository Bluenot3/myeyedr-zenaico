import { useMemo, useState } from "react";
import { MapPin, Plus, Edit3, Save, X, Phone, User, Building2, ShieldCheck } from "lucide-react";
import { useLocations, useCandidates, usePositions, useCreateLocation, useUpdateLocation, Location } from "@/hooks/useRecruiting";
import { REGIONS } from "@/lib/recruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const regionDot: Record<string, string> = {
  "Delaware County": "hsl(var(--emerald))",
  "Chester County": "hsl(var(--cyan))",
  "Bucks County": "hsl(var(--gold))",
  "Montgomery County": "hsl(var(--destructive))",
  "Lehigh Valley": "hsl(196 100% 66%)",
};

export default function LocationsManager() {
  const { data: locations = [] } = useLocations();
  const { data: candidates = [] } = useCandidates();
  const { data: positions = [] } = usePositions();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ region: "Delaware County", site_name: "", manager: "", manager_email: "", address: "", city: "", state: "PA", phone: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Location>>({});

  const grouped = useMemo(() => {
    const m: Record<string, Location[]> = {};
    REGIONS.forEach((r) => (m[r] = []));
    locations.forEach((l) => { (m[l.region] = m[l.region] || []).push(l); });
    return m;
  }, [locations]);

  const counts = (locId: string) => ({
    cands: candidates.filter((c) => c.location_id === locId && c.status === "active").length,
    open: positions.filter((p) => p.location_id === locId && p.status === "open").length,
  });

  const submit = async () => {
    if (!form.site_name.trim()) return;
    await createLocation.mutateAsync({ ...form, active: true });
    setForm({ region: "Delaware County", site_name: "", manager: "", manager_email: "", address: "", city: "", state: "PA", phone: "" });
    setAddOpen(false);
  };

  const startEdit = (l: Location) => { setEditId(l.id); setEdit({ manager: l.manager, manager_email: l.manager_email, address: l.address, phone: l.phone, site_name: l.site_name }); };
  const saveEdit = async (l: Location) => { await updateLocation.mutateAsync({ id: l.id, ...edit }); setEditId(null); };

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold">Locations</h2>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-emerald" style={{ background: "hsl(var(--emerald)/0.12)", border: "1px solid hsl(var(--emerald)/0.3)" }}><ShieldCheck className="h-2.5 w-2.5" /> Admin only</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Manage every MyEyeDr office, assigned manager, and contact info.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Office</span></Button></DialogTrigger>
          <DialogContent className="sm:max-w-md glass-panel">
            <DialogHeader><DialogTitle className="font-display text-xl">Add Office</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label className="text-[10px]">Region</Label>
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Office Name *</Label><Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-[10px]">Street Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" placeholder="123 Main St, Suite 4" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-[10px]">State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label className="text-[10px]">Manager Name</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-[10px]">Manager Email</Label><Input type="email" value={form.manager_email} onChange={(e) => setForm({ ...form, manager_email: e.target.value })} className="mt-1" placeholder="manager@myeyedr.com" /></div>
              <div><Label className="text-[10px]">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!form.site_name.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">Add Office</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REGIONS.map((region) => {
          const offices = grouped[region] || [];
          return (
            <div key={region} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: regionDot[region] }} />
                <h3 className="font-display font-semibold text-foreground">{region}</h3>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{offices.length}</span>
              </div>
              <div className="space-y-2">
                {offices.length === 0 && <p className="text-xs text-muted-foreground py-2">No offices.</p>}
                {offices.map((l) => {
                  const cn = counts(l.id);
                  return editId === l.id ? (
                    <div key={l.id} className="rounded-lg bg-background/50 border border-border p-2.5 space-y-1.5">
                      <Input value={edit.site_name || ""} onChange={(e) => setEdit((s) => ({ ...s, site_name: e.target.value }))} className="h-8 text-xs" placeholder="Office name" />
                      <Input value={edit.address || ""} onChange={(e) => setEdit((s) => ({ ...s, address: e.target.value }))} className="h-8 text-xs" placeholder="Street address" />
                      <Input value={edit.manager || ""} onChange={(e) => setEdit((s) => ({ ...s, manager: e.target.value }))} className="h-8 text-xs" placeholder="Manager name" />
                      <Input value={edit.manager_email || ""} onChange={(e) => setEdit((s) => ({ ...s, manager_email: e.target.value }))} className="h-8 text-xs" placeholder="Manager email" />
                      <Input value={edit.phone || ""} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} className="h-8 text-xs" placeholder="Phone" />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => saveEdit(l)}><Save className="h-3 w-3" /> Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div key={l.id} className="rounded-lg bg-background/40 border border-border/60 p-2.5 group">
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10 border border-emerald/25 shrink-0"><Building2 className="h-4 w-4 text-emerald" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{l.site_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {(l.address || l.city) && <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {[l.address, l.city && `${l.city}, ${l.state}`].filter(Boolean).join(" · ")}</span>}
                          </div>
                        </div>
                        <button onClick={() => startEdit(l)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1"><Edit3 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-10 text-[10px] text-muted-foreground">
                        {l.manager && <span className="inline-flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {l.manager}</span>}
                        {l.manager_email && <span className="inline-flex items-center gap-0.5 text-emerald/90">{l.manager_email}</span>}
                        {l.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {l.phone}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pl-10">
                        <span className="text-[10px] text-cyan">{cn.cands} candidates</span>
                        <span className="text-[10px] text-emerald">{cn.open} open</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
