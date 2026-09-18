import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Layers, UploadCloud, Loader2, FileText, CheckCircle2, AlertTriangle, RefreshCw,
  Users, Sparkles, Copy, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocations, usePositions, useCandidates } from "@/hooks/useRecruiting";
import { SOURCES } from "@/lib/recruiting";
import { uploadAndParseResume, findDuplicate, ParsedResume, DuplicateCandidate } from "@/lib/resume";
import { UploadedDoc } from "@/lib/storage";
import { toast } from "sonner";

type FileStatus = "queued" | "parsing" | "parsed" | "failed" | "saving" | "saved" | "save_failed";
type RowAction = "create" | "merge" | "skip";

interface Row {
  id: string;
  file: File;
  status: FileStatus;
  error: string;
  doc: UploadedDoc | null;
  parsed: Partial<ParsedResume>;
  full_name: string;
  email: string;
  phone: string;
  location_id: string;
  position_id: string;
  source: string;
  tags: string;
  applied_role: string;
  years_experience: number;
  dupOf: { id: string; full_name: string; inBatch?: boolean } | null;
  action: RowAction;
}

/** Parse in parallel but gently — keeps large drops stable on mobile networks. */
const PARSE_CONCURRENCY = 3;
const SAVE_CONCURRENCY = 3;
const MAX_FILES = 200;

export default function BulkResumeUpload() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();
  const { data: candidates = [] } = useCandidates();

  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [committing, setCommitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Live mirror of rows so async workers always dedupe against the newest batch state.
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;
  const candidatesRef = useRef<DuplicateCandidate[]>([]);
  candidatesRef.current = candidates as unknown as DuplicateCandidate[];

  const [defLocation, setDefLocation] = useState("");
  const [defPosition, setDefPosition] = useState("");
  const [defSource, setDefSource] = useState("Indeed");
  const [defTags, setDefTags] = useState("");

  const update = (id: string, u: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...u } : r)));

  const locPositions = (locId: string) =>
    positions.filter((p) => !locId || p.location_id === locId);

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const room = MAX_FILES - rowsRef.current.length;
    if (room <= 0) {
      toast.error(`You can review ${MAX_FILES} résumés at a time. Add this batch, then start another.`);
      return;
    }
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      toast.warning(`Taking the first ${accepted.length} files — ${MAX_FILES} per batch keeps things fast.`);
    }

    const newRows: Row[] = accepted.map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "queued",
      error: "",
      doc: null,
      parsed: {},
      full_name: "",
      email: "",
      phone: "",
      location_id: defLocation,
      position_id: defPosition,
      source: defSource,
      tags: defTags,
      applied_role: "",
      years_experience: 0,
      dupOf: null,
      action: "create",
    }));
    setRows((prev) => [...prev, ...newRows]);
    rowsRef.current = [...rowsRef.current, ...newRows];
    void processQueue(newRows);
  };

  const processQueue = async (queue: Row[]) => {
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const row = queue[i++];
        await processRow(row);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PARSE_CONCURRENCY, queue.length) }, worker),
    );
  };

  /** Duplicate check against saved candidates AND rows already parsed in this batch. */
  const detectDuplicate = (parsed: Partial<ParsedResume>, selfId: string) => {
    const existing = findDuplicate(parsed, candidatesRef.current);
    if (existing) return { id: existing.id, full_name: existing.full_name };

    const batchPeople: DuplicateCandidate[] = rowsRef.current
      .filter((r) => r.id !== selfId && r.status === "parsed" && r.action !== "skip" && !r.dupOf)
      .map((r) => ({ id: r.id, full_name: r.full_name, email: r.email, phone: r.phone }));
    const twin = findDuplicate(parsed, batchPeople);
    return twin ? { id: twin.id, full_name: twin.full_name || "another file in this batch", inBatch: true } : null;
  };

  const processRow = async (row: Row) => {
    update(row.id, { status: "parsing", error: "" });
    try {
      const { parsed, doc } = await uploadAndParseResume(row.file);
      const dup = detectDuplicate(parsed, row.id);
      const next: Partial<Row> = {
        status: "parsed",
        doc,
        parsed,
        full_name: parsed.full_name || row.file.name.replace(/\.[^.]+$/, ""),
        email: parsed.email || "",
        phone: parsed.phone || "",
        applied_role: parsed.applied_role || "",
        years_experience: parsed.years_experience || 0,
        tags: parsed.best_fit_roles || defTags,
        dupOf: dup,
        // A twin inside the same batch is the same person twice — skip it by default.
        action: dup ? (dup.inBatch ? "skip" : "merge") : "create",
      };
      update(row.id, next);
      rowsRef.current = rowsRef.current.map((r) => (r.id === row.id ? { ...r, ...next } : r));
    } catch (e: any) {
      const err = { status: "failed" as FileStatus, error: e?.message || "Could not read this file" };
      update(row.id, err);
      rowsRef.current = rowsRef.current.map((r) => (r.id === row.id ? { ...r, ...err } : r));
    }
  };

  const retryFailed = () => {
    const failed = rowsRef.current.filter((r) => r.status === "failed");
    if (!failed.length) return;
    void processQueue(failed);
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const reset = () => {
    setRows([]);
    rowsRef.current = [];
    setCommitting(false);
    setProgress({ done: 0, total: 0 });
  };

  const parsedRows = rows.filter((r) => r.status === "parsed");
  const readyToCommit = parsedRows.filter((r) => r.action !== "skip");
  const dupCount = parsedRows.filter((r) => r.dupOf).length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const savedCount = rows.filter((r) => r.status === "saved").length;
  const busy = rows.some((r) => r.status === "parsing" || r.status === "queued");

  /** Direct writes: one toast and one cache refresh for the whole batch. */
  const saveRow = async (r: Row) => {
    const loc = locations.find((l) => l.id === r.location_id);
    const tags = r.tags.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);

    if (r.action === "merge" && r.dupOf && !r.dupOf.inBatch) {
      const { error } = await supabase.from("candidate_requisitions").insert([{
        candidate_id: r.dupOf.id,
        position_id: r.position_id || null,
        location_id: r.location_id || null,
        source: r.source,
        stage: "applied",
        status: "active",
        is_primary: false,
        created_by: "Bulk intake",
      }]);
      if (error && error.code !== "23505") throw error;
      await supabase.from("candidate_events").insert([{
        candidate_id: r.dupOf.id,
        event_type: "requisition_add",
        title: `Re-applied via bulk upload${loc ? ` · ${loc.site_name}` : ""}`,
        requisition_id: r.position_id || null,
        location_id: r.location_id || null,
        actor: "Bulk intake",
      }]);
      return "merged" as const;
    }

    const { data, error } = await supabase.from("candidates").insert([{
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      applied_role: r.applied_role,
      position_id: r.position_id || null,
      location_id: r.location_id || null,
      region: loc?.region || "",
      source: r.source,
      headline: r.parsed.headline || "",
      years_experience: Math.round(Number(r.years_experience) || 0),
      best_fit_roles: r.parsed.best_fit_roles || "",
      resume_url: r.doc?.url || "",
      documents: (r.doc ? [r.doc] : []) as any,
      address: r.parsed.address || "",
      current_employer: r.parsed.current_employer || "",
      resume_summary: r.parsed.resume_summary || "",
      resume_text: r.parsed.resume_text || "",
      work_history: (r.parsed.work_history || []) as any,
      education: (r.parsed.education || []) as any,
      certifications: (r.parsed.certifications || []) as any,
      tags: (tags.length ? tags : r.parsed.tags || []) as any,
      parse_confidence: r.parsed.parse_confidence ?? null,
      stage: "applied",
      status: "active",
      score: 0,
      rating: 0,
    }]).select("id").single();
    if (error) throw error;

    await supabase.from("candidate_requisitions").insert([{
      candidate_id: data.id,
      position_id: r.position_id || null,
      location_id: r.location_id || null,
      source: r.source,
      stage: "applied",
      status: "active",
      is_primary: true,
      created_by: "Bulk intake",
    }]);
    await supabase.from("candidate_events").insert([{
      candidate_id: data.id,
      event_type: "applied",
      title: "Added through bulk résumé intake",
      requisition_id: r.position_id || null,
      location_id: r.location_id || null,
      actor: "Bulk intake",
    }]);
    return "created" as const;
  };

  const commit = async () => {
    const queue = rowsRef.current.filter((r) => r.status === "parsed" && r.action !== "skip");
    if (!queue.length) { toast.error("Nothing to add yet"); return; }
    setCommitting(true);
    setProgress({ done: 0, total: queue.length });

    let created = 0, merged = 0, failed = 0;
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const r = queue[i++];
        update(r.id, { status: "saving" });
        try {
          const outcome = await saveRow(r);
          if (outcome === "created") created++; else merged++;
          update(r.id, { status: "saved", error: "" });
        } catch (e: any) {
          failed++;
          update(r.id, { status: "save_failed", error: e?.message || "Could not save" });
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(SAVE_CONCURRENCY, queue.length) }, worker));

    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["candidate_requisitions", "all"] });
    setCommitting(false);

    if (created || merged) {
      toast.success(
        `${created} candidate${created === 1 ? "" : "s"} added${merged ? `, ${merged} merged into existing files` : ""}${failed ? ` · ${failed} need another try` : ""}`,
      );
    }
    if (failed) {
      toast.error(`${failed} could not be saved — they stayed in the list so you can retry.`);
      setRows((prev) => prev.filter((r) => r.status !== "saved").map((r) => (
        r.status === "save_failed" ? { ...r, status: "parsed" } : r
      )));
      rowsRef.current = rowsRef.current.filter((r) => r.status !== "saved");
    } else if (created || merged) {
      reset();
      setOpen(false);
    } else {
      toast.error("Could not add these candidates");
    }
  };

  const statusChip = (r: Row) => {
    if (r.status === "failed" || r.status === "save_failed")
      return <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle className="h-3 w-3" /> {r.status === "failed" ? "Unreadable" : "Not saved"}</span>;
    if (r.status === "saved")
      return <span className="inline-flex items-center gap-1 text-[10px] text-emerald"><CheckCircle2 className="h-3 w-3" /> Saved</span>;
    if (r.status === "parsed")
      return <span className="inline-flex items-center gap-1 text-[10px] text-emerald"><CheckCircle2 className="h-3 w-3" /> Ready</span>;
    if (r.status === "saving")
      return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Reading…</span>;
  };

  const editable = (r: Row) => r.status === "parsed";

  const handlingSelect = (r: Row) => (
    r.dupOf ? (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 text-[9px] text-gold">
          <Copy className="h-2.5 w-2.5" /> {r.dupOf.inBatch ? "Same person twice" : `Matches ${r.dupOf.full_name}`}
        </span>
        <select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as RowAction })} className="h-8 w-full sm:w-32 rounded-md border border-input bg-background px-1.5 text-[11px]" disabled={!editable(r)}>
          {!r.dupOf.inBatch && <option value="merge">Merge into existing</option>}
          <option value="create">Create new anyway</option>
          <option value="skip">Skip</option>
        </select>
      </div>
    ) : (
      <select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as RowAction })} className="h-8 w-full sm:w-24 rounded-md border border-input bg-background px-1.5 text-[11px]" disabled={!editable(r)}>
        <option value="create">Add new</option>
        <option value="skip">Skip</option>
      </select>
    )
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (committing) return; setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col glass-panel">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 pt-6 pb-8 sm:pt-10">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl sm:text-3xl flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/15 border border-emerald/30"><Layers className="h-4.5 w-4.5 text-emerald" /></span>
                Bulk Résumé Intake
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Drop up to {MAX_FILES} résumés at once. Defaults below apply to every file and stay editable per candidate. PDF, Word (.docx), or images.</p>
            </DialogHeader>

            {/* Default assignment bar */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <div>
                <Label className="text-[10px]">Default office</Label>
                <select value={defLocation} onChange={(e) => setDefLocation(e.target.value)} className="w-full h-10 sm:h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default requisition</Label>
                <select value={defPosition} onChange={(e) => setDefPosition(e.target.value)} className="w-full h-10 sm:h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locPositions(defLocation).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default source</Label>
                <select value={defSource} onChange={(e) => setDefSource(e.target.value)} className="w-full h-10 sm:h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default tags</Label>
                <Input value={defTags} onChange={(e) => setDefTags(e.target.value)} placeholder="HIPAA, bilingual…" className="h-10 sm:h-9 mt-1" />
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              className={`mt-4 cursor-pointer rounded-xl border border-dashed p-6 text-center transition-all ${dragOver ? "border-emerald bg-emerald/10" : "border-border hover:border-emerald/50 bg-background/40"}`}
            >
              <input ref={fileInput} type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/15 border border-emerald/30">
                  <UploadCloud className="h-5 w-5 text-emerald" />
                </div>
                <p className="text-sm font-medium text-foreground">Tap to choose résumés, or drop them here</p>
                <p className="text-[11px] text-muted-foreground">We keep the originals, read each one, and flag repeats <Sparkles className="inline h-3 w-3 text-gold" /></p>
              </div>
            </div>

            {/* Review list */}
            {rows.length > 0 && (
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-muted-foreground">
                    <Users className="inline h-3.5 w-3.5 mr-1" />
                    {parsedRows.length} ready · {readyToCommit.length} to add
                    {dupCount > 0 && <span className="text-gold"> · {dupCount} repeat{dupCount > 1 ? "s" : ""} flagged</span>}
                    {failedCount > 0 && <span className="text-destructive"> · {failedCount} unreadable</span>}
                    {savedCount > 0 && <span className="text-emerald"> · {savedCount} saved</span>}
                  </p>
                  <div className="flex items-center gap-3">
                    {failedCount > 0 && (
                      <button onClick={retryFailed} className="text-[11px] text-primary inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Retry {failedCount}
                      </button>
                    )}
                    <button onClick={reset} disabled={committing} className="text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-40">Clear all</button>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {rows.map((r) => (
                    <div key={r.id} className={`rounded-xl border border-border/60 bg-background/50 p-3 ${r.action === "skip" ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {statusChip(r)}
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5"><FileText className="h-2.5 w-2.5 shrink-0" />{r.file.name}</p>
                          {r.error && <p className="text-[10px] text-destructive leading-tight mt-0.5">{r.error}</p>}
                        </div>
                        <button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <Input value={r.full_name} onChange={(e) => update(r.id, { full_name: e.target.value })} placeholder="Full name" className="h-10 text-sm" disabled={!editable(r)} />
                        <Input value={r.email} onChange={(e) => update(r.id, { email: e.target.value })} placeholder="Email" inputMode="email" className="h-10 text-sm" disabled={!editable(r)} />
                        <Input value={r.phone} onChange={(e) => update(r.id, { phone: e.target.value })} placeholder="Phone" inputMode="tel" className="h-10 text-sm" disabled={!editable(r)} />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={r.location_id} onChange={(e) => update(r.id, { location_id: e.target.value, position_id: "" })} className="h-10 rounded-md border border-input bg-background px-2 text-xs" disabled={!editable(r)}>
                            <option value="">Office —</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                          </select>
                          <select value={r.position_id} onChange={(e) => update(r.id, { position_id: e.target.value })} className="h-10 rounded-md border border-input bg-background px-2 text-xs" disabled={!editable(r)}>
                            <option value="">Requisition —</option>
                            {locPositions(r.location_id).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                          </select>
                        </div>
                        {handlingSelect(r)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border">
                      <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Name</th>
                        <th className="px-2 py-2 font-medium">Email</th>
                        <th className="px-2 py-2 font-medium">Phone</th>
                        <th className="px-2 py-2 font-medium">Office</th>
                        <th className="px-2 py-2 font-medium">Requisition</th>
                        <th className="px-2 py-2 font-medium">Source</th>
                        <th className="px-2 py-2 font-medium">Handling</th>
                        <th className="px-2 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={`border-b border-border/40 ${r.action === "skip" ? "opacity-40" : ""}`}>
                          <td className="px-2 py-2 whitespace-nowrap align-top">
                            {statusChip(r)}
                            {r.error && <p className="text-[9px] text-destructive max-w-[140px] leading-tight mt-0.5">{r.error}</p>}
                            <p className="text-[9px] text-muted-foreground truncate max-w-[140px] flex items-center gap-1 mt-0.5"><FileText className="h-2.5 w-2.5 shrink-0" />{r.file.name}</p>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.full_name} onChange={(e) => update(r.id, { full_name: e.target.value })} className="h-8 w-36 text-xs" disabled={!editable(r)} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.email} onChange={(e) => update(r.id, { email: e.target.value })} className="h-8 w-40 text-xs" disabled={!editable(r)} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.phone} onChange={(e) => update(r.id, { phone: e.target.value })} className="h-8 w-28 text-xs" disabled={!editable(r)} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.location_id} onChange={(e) => update(r.id, { location_id: e.target.value, position_id: "" })} className="h-8 w-32 rounded-md border border-input bg-background px-1.5 text-xs" disabled={!editable(r)}>
                              <option value="">—</option>
                              {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.position_id} onChange={(e) => update(r.id, { position_id: e.target.value })} className="h-8 w-36 rounded-md border border-input bg-background px-1.5 text-xs" disabled={!editable(r)}>
                              <option value="">—</option>
                              {locPositions(r.location_id).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.source} onChange={(e) => update(r.id, { source: e.target.value })} className="h-8 w-28 rounded-md border border-input bg-background px-1.5 text-xs" disabled={!editable(r)}>
                              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">{handlingSelect(r)}</td>
                          <td className="px-2 py-2 align-top">
                            <button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-background/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto w-full max-w-6xl flex flex-col sm:flex-row gap-2 px-4 sm:px-8 py-3 sm:justify-end sm:items-center">
            {busy && <span className="text-[11px] text-muted-foreground sm:mr-auto inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Reading résumés…</span>}
            {committing && progress.total > 0 && (
              <span className="text-[11px] text-muted-foreground sm:mr-auto inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving {progress.done} of {progress.total}…
              </span>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={committing} className="h-11 sm:h-10 flex-1 sm:flex-none">Cancel</Button>
              <Button onClick={commit} disabled={committing || busy || !readyToCommit.length} className="h-11 sm:h-10 flex-1 sm:flex-none bg-emerald text-primary-foreground hover:bg-emerald/90 shadow-[0_0_24px_-8px_hsl(var(--emerald))]">
                {committing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add {readyToCommit.length || ""} to Pipeline
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
