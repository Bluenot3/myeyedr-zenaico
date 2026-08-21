import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Trash2, Pencil, X, ClipboardCheck, Phone, Sparkles } from "lucide-react";
import {
  ScorecardTemplate, Competency, TemplateKind, usePositions,
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
  kind: TemplateKind;
  competencies: Competency[];
};

const blankRich = (): Competency => ({
  id: Math.random().toString(36).slice(2, 9),
  label: "", weight: 10, guidance: "",
  title: "", area: "", evidence: "", q1: "", q2: "", quick: "", lookFor: "", anchors: "", redFlags: "",
});

const emptyEditing = (kind: TemplateKind = "interview"): Editing => ({
  name: "", role: "", position_id: "", description: "", kind,
  competencies: [kind === "scorecard" ? blankCompetency() : blankRich()],
});

const KIND_LABEL: Record<TemplateKind, string> = {
  interview: "Interview", phone_screen: "Phone Screen", scorecard: "Scorecard",
};

export default function ScorecardTemplatesManager() {
  const { profile } = useAuth();
  const { data: templates = [] } = useScorecardTemplates();
  const { data: positions = [] } = usePositions();
  const createT = useCreateScorecardTemplate();
  const updateT = useUpdateScorecardTemplate();
  const deleteT = useDeleteScorecardTemplate();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Editing>(emptyEditing());

  const openNew = (kind: TemplateKind = "interview") => { setEdit(emptyEditing(kind)); setOpen(true); };
  const openEdit = (t: ScorecardTemplate) => {
    setEdit({
      id: t.id, name: t.name, role: t.role, position_id: t.position_id || "",
      description: t.description, kind: t.kind || "scorecard",
      competencies: (t.competencies || []).map((c) => ({ ...c })),
    });
    setOpen(true);
  };
  const duplicate = (t: ScorecardTemplate) => {
    createT.mutate({
      name: `${t.name} (copy)`,
      role: t.role,
      position_id: t.position_id,
      description: t.description,
      kind: t.kind || "scorecard",
      competencies: (t.competencies || []).map((c) => ({ ...c, id: Math.random().toString(36).slice(2, 9) })),
      is_default: false,
      created_by: profile?.full_name || profile?.email?.split("@")[0] || "",
    } as any);
  };

  const isRich = edit.kind !== "scorecard";

  const setComp = (id: string, patch: Partial<Competency>) =>
    setEdit((e) => ({ ...e, competencies: e.competencies.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addComp = () => setEdit((e) => ({ ...e, competencies: [...e.competencies, isRich ? blankRich() : blankCompetency()] }));
  const removeComp = (id: string) => setEdit((e) => ({ ...e, competencies: e.competencies.filter((c) => c.id !== id) }));

  const save = async () => {
    if (!edit.name.trim()) return;
    const pos = positions.find((p) => p.id === edit.position_id);
    const cleaned = edit.competencies
      .map((c) => (isRich ? { ...c, label: (c.title || c.label || "").trim() } : c))
      .filter((c) => (isRich ? (c.title || c.label || "").trim() : c.label.trim()));
    const payload: any = {
      name: edit.name.trim(),
      role: edit.role.trim() || pos?.title || "",
      position_id: edit.position_id || null,
      description: edit.description.trim(),
      kind: edit.kind,
      competencies: cleaned,
      created_by: profile?.full_name || profile?.email?.split("@")[0] || "",
    };
    if (edit.id) await updateT.mutateAsync({ id: edit.id, ...payload });
    else await createT.mutateAsync({ ...payload, is_default: false });
    setOpen(false);
  };

  /* ---- Position-specific form generator ---- */
  const [genOpen, setGenOpen] = useState(false);
  const [genBp, setGenBp] = useState(ROLE_BLUEPRINTS[0].key);
  const [genPos, setGenPos] = useState("");
  const [genRole, setGenRole] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  const openGenerator = () => {
    setGenBp(ROLE_BLUEPRINTS[0].key);
    setGenPos("");
    setGenRole("");
    setGenOpen(true);
  };

  const pickPosition = (id: string) => {
    setGenPos(id);
    const p = positions.find((x) => x.id === id);
    if (!p) return;
    const bp = blueprintFor(p.title);
    if (bp) setGenBp(bp.key);
    setGenRole(p.title);
  };

  const generate = async () => {
    const bp = ROLE_BLUEPRINTS.find((b) => b.key === genBp);
    if (!bp) return;
    setGenBusy(true);
    try {
      const forms = buildForms(bp, genRole || undefined);
      let made = 0;
      let skipped = 0;
      for (const f of forms) {
        const dupe = templates.some(
          (t) => t.name.toLowerCase() === f.name.toLowerCase() && (t.position_id || "") === (genPos || ""),
        );
        if (dupe) { skipped++; continue; }
        await createT.mutateAsync({
          name: f.name,
          role: f.role,
          position_id: genPos || null,
          description: f.description,
          kind: f.kind,
          competencies: f.competencies,
          is_default: false,
          created_by: profile?.full_name || profile?.email?.split("@")[0] || "",
        } as any);
        made++;
      }
      toast.success(
        made ? `Created ${made} form${made === 1 ? "" : "s"}${skipped ? ` · ${skipped} already existed` : ""}`
             : "Those forms already exist for this position",
      );
      setGenOpen(false);
    } catch (e: any) {
      toast.error("Could not generate forms: " + (e?.message || "unknown error"));
    } finally {
      setGenBusy(false);
    }
  };

  const activeBp = ROLE_BLUEPRINTS.find((b) => b.key === genBp);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-muted-foreground">Interview & phone-screen forms plus quick scorecards. Same structure for every position — position-specific questions plus a shared work-ethic, reliability and teamwork block.</p>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={openGenerator} className="gap-1.5">
            <Wand2 className="h-4 w-4" /> Generate for a position
          </Button>
          <Button size="sm" variant="outline" onClick={() => openNew("phone_screen")} className="gap-1.5">
            <Phone className="h-4 w-4" /> Phone Screen
          </Button>
          <Button size="sm" onClick={() => openNew("interview")} className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90">
            <Plus className="h-4 w-4" /> New Interview
          </Button>
        </div>
      </div>

      {/* Generator dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">Generate position forms</DialogTitle></DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Creates a matched pair — phone screen + interview evaluation — using the same proven structure, with questions written for this position plus the work ethic, reliability, teamwork, coachability and integrity block.
          </p>
          <div className="space-y-3 mt-1">
            <div>
              <Label className="text-[10px]">Tie to an opening (optional)</Label>
              <select value={genPos} onChange={(e) => pickPosition(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                <option value="">— generic (reusable across offices) —</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}{p.req_code ? ` · ${p.req_code}` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Position blueprint</Label>
              <select value={genBp} onChange={(e) => setGenBp(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                {ROLE_BLUEPRINTS.map((b) => <option key={b.key} value={b.key}>{b.role}</option>)}
              </select>
              {activeBp && <p className="text-[10px] text-muted-foreground mt-1">{activeBp.summary}</p>}
            </div>
            <div>
              <Label className="text-[10px]">Role label on the forms</Label>
              <Input value={genRole} onChange={(e) => setGenRole(e.target.value)} placeholder={activeBp?.role} className="mt-1" />
            </div>
            {activeBp && (
              <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <p className="micro-label text-emerald text-[10px] mb-1.5">What gets created</p>
                <div className="space-y-1">
                  <p className="text-[11px] text-foreground/85">Phone Screen — {buildCompetencies(activeBp, "phone_screen").length} competencies</p>
                  <p className="text-[11px] text-foreground/85">Interview Evaluation — {buildCompetencies(activeBp, "interview").length} competencies</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={genBusy} className="bg-emerald text-primary-foreground hover:bg-emerald/90 gap-1.5">
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate forms
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="glass-panel rounded-xl p-4 hover-lift group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {t.kind === "phone_screen" ? <Phone className="h-4 w-4 text-emerald shrink-0" /> : <ClipboardCheck className="h-4 w-4 text-emerald shrink-0" />}
                  <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-mono uppercase tracking-wide text-holo rounded-full px-1.5 py-0.5 bg-holo/12">{KIND_LABEL[t.kind || "scorecard"]}</span>
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
            <div className="mt-3 space-y-1">
              {(t.competencies || []).slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald shrink-0" />
                  <span className="text-[11px] text-foreground/85 truncate">{c.title || c.label}</span>
                </div>
              ))}
              {(t.competencies || []).length > 6 && <p className="text-[10px] text-muted-foreground pl-3.5">+{(t.competencies || []).length - 6} more</p>}
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-full text-center py-8">No forms yet — create your first interview or phone-screen evaluation.</p>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{edit.id ? "Edit Form" : `New ${KIND_LABEL[edit.kind]}`}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px]">Name *</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-1" placeholder="e.g. Optician — Interview" /></div>
              <div>
                <Label className="text-[10px]">Form type</Label>
                <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as TemplateKind })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="interview">Interview</option>
                  <option value="phone_screen">Phone Screen</option>
                  <option value="scorecard">Quick Scorecard</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Tie to opening</Label>
                <select value={edit.position_id} onChange={(e) => setEdit({ ...edit, position_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— generic —</option>
                  {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Role label</Label><Input value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} className="mt-1" placeholder="e.g. Patient Service Coordinator" /></div>
            </div>
            <div><Label className="text-[10px]">Description</Label><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="mt-1" placeholder="How this form should be used" /></div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[10px]">Competencies & questions</Label>
                <span className="text-[10px] text-muted-foreground">{edit.competencies.length} items</span>
              </div>
              <div className="space-y-2.5">
                {edit.competencies.map((c, i) => (
                  <div key={c.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                      {isRich ? (
                        <Input value={c.title || ""} onChange={(e) => setComp(c.id, { title: e.target.value })} placeholder="Competency title (e.g. Phone Control)" className="h-8 text-xs flex-1" />
                      ) : (
                        <>
                          <Input value={c.label} onChange={(e) => setComp(c.id, { label: e.target.value })} placeholder="Competency" className="h-8 text-xs flex-1" />
                          <Input type="number" value={c.weight} onChange={(e) => setComp(c.id, { weight: Number(e.target.value) })} className="h-8 text-xs w-16" />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </>
                      )}
                      <button onClick={() => removeComp(c.id)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                    </div>
                    {isRich ? (
                      <div className="space-y-1.5">
                        <Input value={c.area || ""} onChange={(e) => setComp(c.id, { area: e.target.value })} placeholder="Area (e.g. Phones / Caller Experience)" className="h-8 text-xs" />
                        <Input value={c.evidence || ""} onChange={(e) => setComp(c.id, { evidence: e.target.value })} placeholder="What good looks like (evidence line)" className="h-8 text-xs" />
                        <Input value={c.q1 || ""} onChange={(e) => setComp(c.id, { q1: e.target.value })} placeholder="Question A" className="h-8 text-xs" />
                        <Input value={c.q2 || ""} onChange={(e) => setComp(c.id, { q2: e.target.value })} placeholder="Question B" className="h-8 text-xs" />
                        <Input value={c.quick || ""} onChange={(e) => setComp(c.id, { quick: e.target.value })} placeholder="Quick script (fast view)" className="h-8 text-xs" />
                        <Input value={c.lookFor || ""} onChange={(e) => setComp(c.id, { lookFor: e.target.value })} placeholder="Listen for…" className="h-8 text-xs" />
                        <Input value={c.anchors || ""} onChange={(e) => setComp(c.id, { anchors: e.target.value })} placeholder="Scoring anchors (0–4 guide)" className="h-8 text-xs" />
                        <Input value={c.redFlags || ""} onChange={(e) => setComp(c.id, { redFlags: e.target.value })} placeholder="Red flags / no-hire watch" className="h-8 text-xs" />
                      </div>
                    ) : (
                      <Input value={c.guidance} onChange={(e) => setComp(c.id, { guidance: e.target.value })} placeholder="What to ask & look for…" className="h-8 text-xs" />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addComp} className="mt-2 text-[11px] text-emerald inline-flex items-center gap-0.5"><Plus className="h-3.5 w-3.5" /> Add competency</button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!edit.name.trim() || createT.isPending || updateT.isPending} className="bg-emerald text-primary-foreground hover:bg-emerald/90">Save Form</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
