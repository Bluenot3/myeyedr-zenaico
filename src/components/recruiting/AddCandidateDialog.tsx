import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus, Loader2, UploadCloud, FileText, Sparkles, X, Paperclip, CheckCircle2, ScanEye, Link2, ExternalLink,
} from "lucide-react";
import { useCreateCandidate, useLocations, usePositions } from "@/hooks/useRecruiting";
import { SOURCES } from "@/lib/recruiting";
import { supabase } from "@/integrations/supabase/client";
import { uploadCandidateFile as uploadFile, fileToBase64, UploadedDoc as DocEntry } from "@/lib/storage";
import { toast } from "sonner";

interface Props {
  compact?: boolean;
}


const EMPTY = {
  full_name: "", email: "", phone: "", applied_role: "", position_id: "",
  location_id: "", region: "", source: "Indeed", headline: "", years_experience: 0,
  best_fit_roles: "", apply_url: "",
};

export default function AddCandidateDialog({ compact }: Props) {
  const [open, setOpen] = useState(false);
  const createCandidate = useCreateCandidate();
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();

  const [form, setForm] = useState({ ...EMPTY });
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const resumeInput = useRef<HTMLInputElement>(null);
  const attachInput = useRef<HTMLInputElement>(null);

  const set = (u: Partial<typeof form>) => setForm((p) => ({ ...p, ...u }));

  const reset = () => {
    setForm({ ...EMPTY });
    setDocs([]);
    setParsed(false);
    setParsing(false);
  };

  const handleResume = async (file: File) => {
    if (!file) return;
    setParsing(true);
    try {
      // Upload + parse in parallel
      const [{ url }, base64] = await Promise.all([uploadFile(file), fileToBase64(file)]);
      setDocs((d) => [...d.filter((x) => x.kind !== "resume"), { name: file.name, url, type: file.type, size: file.size, kind: "resume" }]);

      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const d = data?.data || {};

      // Years may arrive as a number, "4", or "4 years" — pull the first integer.
      const yearsRaw = d.years_experience;
      const yearsNum = typeof yearsRaw === "number"
        ? yearsRaw
        : parseFloat(String(yearsRaw ?? "").replace(/[^0-9.]/g, ""));
      const years = Number.isFinite(yearsNum) ? Math.round(yearsNum) : 0;

      // Skills may arrive as an array or a comma/newline separated string.
      const skills = Array.isArray(d.skills)
        ? d.skills
        : String(d.skills ?? "").split(/[,\n;]+/).map((s: string) => s.trim()).filter(Boolean);

      // Merge onto whatever is there — only overwrite a field when the parser
      // actually found something, so a partial parse never wipes good data.
      set({
        ...(d.full_name ? { full_name: String(d.full_name) } : {}),
        ...(d.email ? { email: String(d.email) } : {}),
        ...(d.phone ? { phone: String(d.phone) } : {}),
        ...(d.applied_role ? { applied_role: String(d.applied_role) } : {}),
        ...(d.headline || d.summary
          ? { headline: String(d.headline || String(d.summary).slice(0, 90)) }
          : {}),
        ...(years ? { years_experience: years } : {}),
        ...(skills.length ? { best_fit_roles: skills.slice(0, 6).join(", ") } : {}),
      });
      setParsed(true);
      toast.success("Résumé parsed — review and adjust below");
    } catch (e: any) {
      toast.error("Couldn't auto-parse — you can still enter details manually. " + (e?.message || ""));
    } finally {
      setParsing(false);
    }
  };

  const handleAttach = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttaching(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadFile(file);
        setDocs((d) => [...d, { name: file.name, url, type: file.type, size: file.size, kind: "attachment" }]);
      }
      toast.success("Attached");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || ""));
    } finally {
      setAttaching(false);
    }
  };

  const removeDoc = (url: string) => setDocs((d) => d.filter((x) => x.url !== url));

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    const loc = locations.find((l) => l.id === form.location_id);
    const resume = docs.find((d) => d.kind === "resume");
    const linkUrl = form.apply_url.trim();
    const linkDocs: DocEntry[] = linkUrl
      ? [{ name: `${form.source || "Application"} link`, url: linkUrl, type: "link", size: 0, kind: "attachment" }]
      : [];
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
      years_experience: Math.round(Number(form.years_experience) || 0),
      best_fit_roles: form.best_fit_roles,
      resume_url: resume?.url || "",
      documents: [...docs, ...linkDocs] as any,
      stage: "applied",
      status: "active",
      score: 0,
      rating: 0,
    });
    reset();
    setOpen(false);
  };

  const locPositions = positions.filter((p) => !form.location_id || p.location_id === form.location_id);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-9 bg-emerald text-primary-foreground hover:bg-emerald/90 shadow-[0_0_20px_-6px_hsl(var(--emerald))]">
          <UserPlus className="h-4 w-4" />
          <span className={compact ? "hidden sm:inline" : ""}>Add Candidate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col glass-panel">
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-8 pt-6 pb-8 sm:pt-10">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl sm:text-3xl flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/15 border border-emerald/30"><ScanEye className="h-4.5 w-4.5 text-emerald" /></span>
            Candidate Intake
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Drop a résumé to auto-fill, paste an Indeed link, attach anything, or type it in. Everything is editable — just fix anything the parser missed.</p>
        </DialogHeader>


        {/* Résumé dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleResume(f); }}
          onClick={() => !parsing && resumeInput.current?.click()}
          className={`relative mt-1 cursor-pointer rounded-xl border border-dashed p-5 text-center transition-all ${dragOver ? "border-emerald bg-emerald/10" : "border-border hover:border-emerald/50 bg-background/40"}`}
        >
          <input ref={resumeInput} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResume(f); e.target.value = ""; }} />
          {parsing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald" />
              <p className="text-xs text-muted-foreground">Reading résumé & extracting details…</p>
            </div>
          ) : parsed ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <CheckCircle2 className="h-6 w-6 text-emerald" />
              <p className="text-sm font-medium text-foreground">Résumé parsed</p>
              <p className="text-[11px] text-muted-foreground">Click to replace with a different file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/15 border border-emerald/30">
                <UploadCloud className="h-5 w-5 text-emerald" />
              </div>
              <p className="text-sm font-medium text-foreground">Drop résumé here or click to upload</p>
              <p className="text-[11px] text-muted-foreground">PDF, Word, or image · we'll auto-fill the fields below <Sparkles className="inline h-3 w-3 text-gold" /></p>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          {docs.length > 0 && (
            <div className="space-y-1.5">
              {docs.map((d) => (
                <div key={d.url} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2">
                  <FileText className={`h-4 w-4 shrink-0 ${d.kind === "resume" ? "text-emerald" : "text-holo"}`} />
                  <span className="text-xs text-foreground truncate flex-1">{d.name}</span>
                  {d.kind === "resume" && <span className="text-[9px] font-mono uppercase text-emerald">résumé</span>}
                  <button onClick={() => removeDoc(d.url)} className="tap-target text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <input ref={attachInput} type="file" multiple className="hidden" onChange={(e) => { handleAttach(e.target.files); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs w-full" disabled={attaching} onClick={() => attachInput.current?.click()}>
            {attaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />} Attach other documents
          </Button>
        </div>

        {/* Indeed / application link */}
        <div className="rounded-xl border border-holo/25 bg-holo/[0.06] p-3">
          <Label className="text-[10px] flex items-center gap-1.5 text-holo"><Link2 className="h-3 w-3" /> Indeed / application link</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              value={form.apply_url}
              onChange={(e) => set({ apply_url: e.target.value })}
              placeholder="Paste the Indeed applicant or job posting URL"
              className="h-10 flex-1"
              inputMode="url"
            />
            {form.apply_url.trim() && (
              <a href={form.apply_url} target="_blank" rel="noreferrer" className="tap-target flex h-10 w-10 items-center justify-center rounded-md border border-holo/30 text-holo hover:bg-holo/10">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Saved with the candidate so you can jump back to Indeed in one tap.</p>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div>
            <Label className="text-[10px]">Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Candidate name" className="mt-1" />
          </div>
          <div>
            <Label className="text-[10px]">Headline</Label>
            <Input value={form.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. PSC, 4 yrs front desk" className="mt-1" />
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
            <Label className="text-[10px]">Years Experience</Label>
            <Input type="number" min={0} value={form.years_experience} onChange={(e) => set({ years_experience: Number(e.target.value) })} className="mt-1" />
          </div>
          <div>
            <Label className="text-[10px]">Source</Label>
            <select value={form.source} onChange={(e) => set({ source: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10px]">Key Skills / Tags</Label>
            <Input value={form.best_fit_roles} onChange={(e) => set({ best_fit_roles: e.target.value })} placeholder="e.g. HIPAA, multi-line phones, insurance verification" className="mt-1" />
          </div>
        </div>
        </div>
        </div>


        <div className="shrink-0 border-t border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-2xl flex gap-2 px-4 sm:px-8 py-3 justify-end">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} className="flex-1 sm:flex-none tap-target h-11 sm:h-10">Cancel</Button>
            <Button onClick={submit} disabled={createCandidate.isPending || parsing || !form.full_name.trim()} className="flex-1 sm:flex-none tap-target h-11 sm:h-10 bg-emerald text-primary-foreground hover:bg-emerald/90 shadow-[0_0_24px_-8px_hsl(var(--emerald))]">
              {createCandidate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add to Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
}
