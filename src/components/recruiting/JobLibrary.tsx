import { useMemo, useRef, useState } from "react";
import {
  Briefcase, Plus, Loader2, Trash2, Pencil, FileText, UploadCloud, ClipboardPaste,
  Sparkles, Rocket, Search, Tag, X,
} from "lucide-react";
import {
  useJobTemplates, useCreateJobTemplate, useUpdateJobTemplate, useDeleteJobTemplate,
  useCreatePosition, useLocations, JobTemplate,
} from "@/hooks/useRecruiting";
import { PRIORITIES } from "@/lib/recruiting";
import { supabase } from "@/integrations/supabase/client";
import { fileToBase64 } from "@/lib/storage";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type JobForm = {
  title: string; department: string; employment_type: string;
  description: string; requirements: string; pay_range: string; tags: string[];
};

const EMPTY: JobForm = { title: "", department: "", employment_type: "Full-time", description: "", requirements: "", pay_range: "", tags: [] };

async function parseJobFile(file: File) {
  let body: Record<string, unknown>;
  if (/\.docx$/i.test(file.name) || file.type.includes("wordprocessingml")) {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value?.trim()) throw new Error("Could not read text from this document.");
    body = { jobText: value, fileName: file.name };
  } else {
    const base64 = await fileToBase64(file);
    body = { fileBase64: base64, fileName: file.name, mimeType: file.type };
  }
  const { data, error } = await supabase.functions.invoke("parse-job", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data as Record<string, any>;
}

export default function JobLibrary() {
  const { data: jobs = [], isLoading } = useJobTemplates();
  const { data: locations = [] } = useLocations();
  const create = useCreateJobTemplate();
  const update = useUpdateJobTemplate();
  const del = useDeleteJobTemplate();
  const createPosition = useCreatePosition();

  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JobTemplate | null>(null);
  const [reqFor, setReqFor] = useState<JobTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.department, j.description, ...(j.tags || [])].join(" ").toLowerCase().includes(q));
  }, [jobs, query]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (j: JobTemplate) => { setEditing(j); setEditorOpen(true); };

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Job Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Save reusable job descriptions — import a PDF or paste text — then spin up requisitions for any office in seconds.</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90" onClick={openNew}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Job</span>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs…" className="pl-8 h-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-14 text-center">
          <Briefcase className="h-7 w-7 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No jobs yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Add a job by uploading a PDF, pasting text, or entering it manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((j) => (
            <div key={j.id} className="glass-panel rounded-xl p-4 hover-lift flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-holo/12 border border-holo/30 shrink-0"><FileText className="h-4 w-4 text-holo" /></div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{j.title}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{[j.department, j.employment_type, j.pay_range].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(j)} className="tap-target text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete "${j.title}" from the library?`)) del.mutate(j.id); }} className="tap-target text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {j.description && <p className="mt-2.5 text-[11px] text-muted-foreground/90 leading-relaxed line-clamp-3">{j.description}</p>}
              {j.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {j.tags.slice(0, 6).map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground border border-border"><Tag className="h-2.5 w-2.5" />{t}</span>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
                <Button size="sm" className="h-8 gap-1.5 bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25" onClick={() => setReqFor(j)}>
                  <Rocket className="h-3.5 w-3.5" /> Create requisition
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <JobEditor
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSave={async (form) => {
            if (editing) await update.mutateAsync({ id: editing.id, ...form });
            else await create.mutateAsync(form);
            setEditorOpen(false);
          }}
          saving={create.isPending || update.isPending}
        />
      )}

      {reqFor && (
        <RequisitionFromJob
          job={reqFor}
          locations={locations}
          onClose={() => setReqFor(null)}
          onCreate={async (payload) => {
            const loc = locations.find((l) => l.id === payload.location_id);
            await createPosition.mutateAsync({
              title: reqFor.title,
              department: reqFor.department,
              employment_type: reqFor.employment_type,
              description: reqFor.description,
              requirements: reqFor.requirements,
              pay_range: reqFor.pay_range,
              location_id: payload.location_id || null,
              region: loc?.region || "",
              openings: payload.openings,
              priority: payload.priority,
              status: payload.status,
              hiring_manager: payload.hiring_manager,
              posting_locations: [],
            });
            setReqFor(null);
          }}
          creating={createPosition.isPending}
        />
      )}
    </div>
  );
}

function JobEditor({ initial, onClose, onSave, saving }: {
  initial: JobTemplate | null;
  onClose: () => void;
  onSave: (f: JobForm) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<JobForm>(initial ? {
    title: initial.title, department: initial.department, employment_type: initial.employment_type,
    description: initial.description, requirements: initial.requirements, pay_range: initial.pay_range, tags: initial.tags || [],
  } : EMPTY);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const applyParsed = (d: Record<string, any>) => {
    setForm((f) => ({
      ...f,
      title: d.title || f.title,
      department: d.department || f.department,
      employment_type: d.employment_type || f.employment_type,
      description: d.description || f.description,
      requirements: d.requirements || f.requirements,
      pay_range: d.pay_range || f.pay_range,
      tags: Array.isArray(d.tags) && d.tags.length ? d.tags.map(String) : f.tags,
    }));
  };

  const parseFromText = async () => {
    if (!pasteText.trim()) { toast.error("Paste a job description first"); return; }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-job", { body: { jobText: pasteText } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      applyParsed(data.data || {});
      toast.success("Extracted — review and save");
    } catch (e: any) { toast.error(e.message || "Could not parse"); } finally { setParsing(false); }
  };

  const parseFromFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      applyParsed(await parseJobFile(file));
      toast.success("Extracted from file — review and save");
    } catch (e: any) { toast.error(e.message || "Could not read file"); } finally { setParsing(false); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-xl">{initial ? "Edit job" : "Add job"}</DialogTitle></DialogHeader>

        {!initial && (
          <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald" /> Import (optional)</p>
            <input ref={fileInput} type="file" accept=".pdf,.docx,image/*" className="hidden" onChange={(e) => { parseFromFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste a job posting here…" className="text-xs min-h-[70px]" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1" disabled={parsing} onClick={parseFromText}>
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5" />} Parse text
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1" disabled={parsing} onClick={() => fileInput.current?.click()}>
                <UploadCloud className="h-3.5 w-3.5" /> Upload PDF
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div className="sm:col-span-2"><Label className="text-[10px]">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Patient Services Coordinator" /></div>
          <div><Label className="text-[10px]">Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-[10px]">Employment</Label>
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
              <option>Full-time</option><option>Part-time</option><option>PRN</option>
            </select>
          </div>
          <div className="sm:col-span-2"><Label className="text-[10px]">Pay range</Label><Input value={form.pay_range} onChange={(e) => setForm({ ...form, pay_range: e.target.value })} className="mt-1" placeholder="$18–20/hr" /></div>
          <div className="sm:col-span-2"><Label className="text-[10px]">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[110px]" /></div>
          <div className="sm:col-span-2"><Label className="text-[10px]">Requirements</Label><Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="mt-1 min-h-[70px]" /></div>
          <div className="sm:col-span-2">
            <Label className="text-[10px]">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.tags.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 bg-muted text-foreground border border-border">
                  {t}<button onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add a tag" className="h-8 text-xs" />
              <Button size="sm" variant="outline" className="h-8" onClick={addTag}>Add</Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.title.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequisitionFromJob({ job, locations, onClose, onCreate, creating }: {
  job: JobTemplate;
  locations: { id: string; site_name: string; region: string }[];
  onClose: () => void;
  onCreate: (p: { location_id: string; openings: number; priority: string; status: string; hiring_manager: string }) => Promise<void>;
  creating: boolean;
}) {
  const [location_id, setLoc] = useState("");
  const [openings, setOpenings] = useState(1);
  const [priority, setPriority] = useState("normal");
  const [status, setStatus] = useState("open");
  const [hiring_manager, setHM] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-panel">
        <DialogHeader><DialogTitle className="font-display text-lg flex items-center gap-2"><Rocket className="h-4 w-4 text-emerald" /> New requisition — {job.title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="col-span-2"><Label className="text-[10px]">Office</Label>
            <select value={location_id} onChange={(e) => setLoc(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
            </select>
          </div>
          <div><Label className="text-[10px]"># Openings</Label><Input type="number" min={1} value={openings} onChange={(e) => setOpenings(Math.max(1, Number(e.target.value)))} className="mt-1" /></div>
          <div><Label className="text-[10px]">Priority</Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><Label className="text-[10px]">Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
              <option value="open">open</option><option value="on_hold">on hold</option><option value="filled">filled</option><option value="closed">closed (record)</option>
            </select>
          </div>
          <div><Label className="text-[10px]">Hiring manager</Label><Input value={hiring_manager} onChange={(e) => setHM(e.target.value)} className="mt-1" placeholder="Owner" /></div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Use <strong>closed</strong> or <strong>filled</strong> to log historical requisitions for your records.</p>
        <DialogFooter className="mt-4 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onCreate({ location_id, openings, priority, status, hiring_manager })} disabled={creating} className="bg-emerald text-primary-foreground hover:bg-emerald/90">
            {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
