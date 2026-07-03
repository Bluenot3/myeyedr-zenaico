import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Trash2, Pencil, X, ClipboardCheck, Sparkles } from "lucide-react";
import {
  ScorecardTemplate, Competency, usePositions,
  useScorecardTemplates, useCreateScorecardTemplate, useUpdateScorecardTemplate, useDeleteScorecardTemplate,
} from "@/hooks/useRecruiting";
import { blankCompetency } from "@/lib/scorecard";
import { useAuth } from "@/hooks/useAuth";

type Editing = {
  id?: string;
  name: string;
  role: string;
  position_id: string;
  description: string;
  competencies: Competency[];
};

const emptyEditing = (): Editing => ({
  name: "",
  role: "",
  position_id: "",
  description: "",
  competencies: [blankCompetency()],
});

export default function ScorecardTemplatesManager() {
  const { profile } = useAuth();
  const { data: templates = [] } = useScorecardTemplates();
  const { data: positions = [] } = usePositions();
  const createT = useCreateScorecardTemplate();
  const updateT = useUpdateScorecardTemplate();
  const deleteT = useDeleteScorecardTemplate();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Editing>(emptyEditing());

  const openNew = () => { setEdit(emptyEditing()); setOpen(true); };
  const openEdit = (t: ScorecardTemplate) => {
    setEdit({
      id: t.id, name: t.name, role: t.role, position_id: t.position_id || "",
      description: t.description, competencies: (t.competencies || []).map((c) => ({ ...c })),
    });
    setOpen(true);
  };
  const duplicate = (t: ScorecardTemplate) => {
    createT.mutate({
      name: `${t.name} (copy)`,
      role: t.role,
      position_id: t.position_id,
      description: t.description,
      competencies: (t.competencies || []).map((c) => ({ ...c, id: Math.random().toString(36).slice(2, 9) })),
      is_default: false,
      created_by: profile?.full_name || profile?.email?.split("@")[0] || "",
    });
  };

  const totalWeight = edit.competencies.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  const setComp = (id: string, patch: Partial<Competency>) =>
    setEdit((e) => ({ ...e, competencies: e.competencies.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addComp = () => setEdit((e) => ({ ...e, competencies: [...e.competencies, blankCompetency()] }));
  const removeComp = (id: string) => setEdit((e) => ({ ...e, competencies: e.competencies.filter((c) => c.id !== id) }));

  const save = async () => {
    if (!edit.name.trim()) return;
    const pos = positions.find((p) => p.id === edit.position_id);
    const payload = {
      name: edit.name.trim(),
      role: edit.role.trim() || pos?.title || "",
      position_id: edit.position_id || null,
      description: edit.description.trim(),
      competencies: edit.competencies.filter((c) => c.label.trim()) as any,
      created_by: profile?.full_name || profile?.email?.split("@")[0] || "",
    };
    if (edit.id) await updateT.mutateAsync({ id: edit.id, ...payload });
    else await createT.mutateAsync({ ...payload, is_default: false });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Position-specific interview scorecards. Edit, duplicate, and reuse across roles.</p>
        <Button size="sm" onClick={openNew} className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90">
          <Plus className="h-4 w-4" /> New Scorecard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="glass-panel rounded-xl p-4 hover-lift group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-emerald shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {t.role && <span className="text-[9px] font-mono uppercase tracking-wide text-emerald">{t.role}</span>}
                  {t.is_default && <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase text-gold"><Sparkles className="h-2.5 w-2.5" /> default</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(t)} title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
                <button onClick={() => duplicate(t)} title="Duplicate"><Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
                <button onClick={() => deleteT.mutate(t.id)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
              </div>
            </div>
            {t.description && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{t.description}</p>}
            <div className="mt-3 space-y-1.5">
              {(t.competencies || []).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 text-[11px] text-foreground/85 truncate">{c.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, c.weight)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{c.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-full text-center py-8">No scorecards yet — create your first position-specific evaluation.</p>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{edit.id ? "Edit Scorecard" : "New Scorecard"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-[10px]">Name *</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-1" placeholder="e.g. Optician — Interview Scorecard" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Tie to opening</Label>
                <select value={edit.position_id} onChange={(e) => setEdit({ ...edit, position_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— generic —</option>
                  {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Role label</Label><Input value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} className="mt-1" placeholder="e.g. Patient Services Coordinator" /></div>
            </div>
            <div><Label className="text-[10px]">Description</Label><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="mt-1" placeholder="How this scorecard should be used" /></div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[10px]">Competencies</Label>
                <span className={`text-[10px] ${totalWeight === 100 ? "text-emerald" : "text-muted-foreground"}`}>weights total {totalWeight}%</span>
              </div>
              <div className="space-y-2.5">
                {edit.competencies.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={c.label} onChange={(e) => setComp(c.id, { label: e.target.value })} placeholder="Competency (e.g. Patient-First Service)" className="h-8 text-xs flex-1" />
                      <Input type="number" value={c.weight} onChange={(e) => setComp(c.id, { weight: Number(e.target.value) })} className="h-8 text-xs w-16" />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      <button onClick={() => removeComp(c.id)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                    </div>
                    <Input value={c.guidance} onChange={(e) => setComp(c.id, { guidance: e.target.value })} placeholder="What to ask & look for…" className="h-8 text-xs" />
                  </div>
                ))}
              </div>
              <button onClick={addComp} className="mt-2 text-[11px] text-emerald inline-flex items-center gap-0.5"><Plus className="h-3.5 w-3.5" /> Add competency</button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!edit.name.trim() || createT.isPending || updateT.isPending} className="bg-emerald text-primary-foreground hover:bg-emerald/90">Save Scorecard</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
