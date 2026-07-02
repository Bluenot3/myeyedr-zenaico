import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, Loader2 } from "lucide-react";
import { useCreateCandidate, useLocations, usePositions } from "@/hooks/useRecruiting";
import { SOURCES } from "@/lib/recruiting";
import { toast } from "sonner";

interface Props {
  triggerClassName?: string;
  compact?: boolean;
}

export default function AddCandidateDialog({ compact }: Props) {
  const [open, setOpen] = useState(false);
  const createCandidate = useCreateCandidate();
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", applied_role: "", position_id: "",
    location_id: "", region: "", source: "Indeed", headline: "", years_experience: 0,
  });

  const set = (u: Partial<typeof form>) => setForm((p) => ({ ...p, ...u }));

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    const loc = locations.find((l) => l.id === form.location_id);
    await createCandidate.mutateAsync({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      applied_role: form.applied_role,
      position_id: form.position_id || null,
      location_id: form.location_id || null,
      region: loc?.region || form.region,
      source: form.source,
      headline: form.headline,
      years_experience: form.years_experience,
      stage: "applied",
      status: "active",
      score: 0,
      rating: 0,
    });
    setForm({ full_name: "", email: "", phone: "", applied_role: "", position_id: "", location_id: "", region: "", source: "Indeed", headline: "", years_experience: 0 });
    setOpen(false);
  };

  const locPositions = positions.filter((p) => !form.location_id || p.location_id === form.location_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-9 bg-emerald text-primary-foreground hover:bg-emerald/90">
          <UserPlus className="h-4 w-4" />
          <span className={compact ? "hidden sm:inline" : ""}>Add Candidate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-panel">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px]">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Candidate name" className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Headline</Label>
              <Input value={form.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. Optician, 4 yrs" className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Email</Label>
              <Input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="email@example.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Phone</Label>
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(555) 555-5555" className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Office / Location</Label>
              <select value={form.location_id} onChange={(e) => { const l = locations.find(x => x.id === e.target.value); set({ location_id: e.target.value, region: l?.region || "", position_id: "" }); }} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                <option value="">Select office…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Open Position</Label>
              <select value={form.position_id} onChange={(e) => { const p = positions.find(x => x.id === e.target.value); set({ position_id: e.target.value, applied_role: p?.title || form.applied_role }); }} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                <option value="">Select opening…</option>
                {locPositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Applied Role</Label>
              <Input value={form.applied_role} onChange={(e) => set({ applied_role: e.target.value })} placeholder="Role title" className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Source</Label>
              <select value={form.source} onChange={(e) => set({ source: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createCandidate.isPending || !form.full_name.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">
            {createCandidate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add to Pipeline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
