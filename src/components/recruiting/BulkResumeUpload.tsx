import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Layers, UploadCloud, Loader2, FileText, CheckCircle2, AlertTriangle, X,
  Users, Sparkles, Copy, Trash2,
} from "lucide-react";
import {
  useLocations, usePositions, useCandidates, useCreateCandidate, useCreateApplication,
  Candidate,
} from "@/hooks/useRecruiting";
import { SOURCES } from "@/lib/recruiting";
import { uploadAndParseResume, findDuplicate, ParsedResume } from "@/lib/resume";
import { UploadedDoc } from "@/lib/storage";
import { toast } from "sonner";

type FileStatus = "queued" | "uploading" | "parsing" | "parsed" | "failed";
type RowAction = "create" | "merge" | "skip";

interface Row {
  id: string;
  file: File;
  status: FileStatus;
  error: string;
  doc: UploadedDoc | null;
  parsed: Partial<ParsedResume>;
  // editable fields
  full_name: string;
  email: string;
  phone: string;
  location_id: string;
  position_id: string;
  source: string;
  tags: string;
  applied_role: string;
  years_experience: number;
  // duplicate handling
  dupOf: { id: string; full_name: string } | null;
  action: RowAction;
}

const CONCURRENCY = 3;

export default function BulkResumeUpload() {
  const [open, setOpen] = useState(false);
  const { data: locations = [] } = useLocations();
  const { data: positions = [] } = usePositions();
  const { data: candidates = [] } = useCandidates();
  const createCandidate = useCreateCandidate();
  const createApplication = useCreateApplication();

  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [committing, setCommitting] = useState(false);

  // Default assignment controls (applied to all uploads, editable per row after)
  const [defLocation, setDefLocation] = useState("");
  const [defPosition, setDefPosition] = useState("");
  const [defSource, setDefSource] = useState("Indeed");
  const [defTags, setDefTags] = useState("");

  const update = (id: string, u: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...u } : r)));

  const locPositions = (locId: string) =>
    positions.filter((p) => !locId || p.location_id === locId);

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const newRows: Row[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    processQueue(newRows);
  };

  // Simple concurrency-limited processor.
  const processQueue = async (queue: Row[]) => {
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const row = queue[i++];
        await processRow(row);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  };

  const processRow = async (row: Row) => {
    update(row.id, { status: "parsing" });
    try {
      const { parsed, doc } = await uploadAndParseResume(row.file);
      const dup = findDuplicate(parsed, candidates as any);
      update(row.id, {
        status: "parsed",
        doc,
        parsed,
        full_name: parsed.full_name || row.file.name.replace(/\.[^.]+$/, ""),
        email: parsed.email || "",
        phone: parsed.phone || "",
        applied_role: parsed.applied_role || "",
        years_experience: parsed.years_experience || 0,
        tags: parsed.best_fit_roles || defTags,
        dupOf: dup ? { id: dup.id, full_name: dup.full_name } : null,
        action: dup ? "merge" : "create",
      });
    } catch (e: any) {
      update(row.id, { status: "failed", error: e?.message || "Failed to parse" });
    }
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const reset = () => {
    setRows([]);
    setCommitting(false);
  };

  const parsedRows = rows.filter((r) => r.status === "parsed");
  const readyToCommit = parsedRows.filter((r) => r.action !== "skip");
  const dupCount = parsedRows.filter((r) => r.dupOf).length;
  const busy = rows.some((r) => r.status === "parsing" || r.status === "queued");

  const commit = async () => {
    if (!readyToCommit.length) { toast.error("Nothing to add"); return; }
    setCommitting(true);
    let created = 0, merged = 0, failed = 0;
    for (const r of readyToCommit) {
      try {
        const loc = locations.find((l) => l.id === r.location_id);
        const tags = r.tags.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);
        if (r.action === "merge" && r.dupOf) {
          // Attach as a new application to the existing master person — no new duplicate.
          await createApplication.mutateAsync({
            candidate_id: r.dupOf.id,
            position_id: r.position_id || null,
            location_id: r.location_id || null,
            source: r.source,
            title: `Re-applied via bulk upload${loc ? ` · ${loc.site_name}` : ""}`,
          });
          merged++;
        } else {
          await createCandidate.mutateAsync({
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
          });
          created++;
        }
      } catch {
        failed++;
      }
    }
    setCommitting(false);
    if (created || merged) {
      toast.success(`${created} added${merged ? `, ${merged} merged into existing` : ""}${failed ? `, ${failed} failed` : ""}`);
      reset();
      setOpen(false);
    } else {
      toast.error("Could not add candidates");
    }
  };

  const statusChip = (r: Row) => {
    if (r.status === "failed") return <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle className="h-3 w-3" /> Failed</span>;
    if (r.status === "parsed") return <span className="inline-flex items-center gap-1 text-[10px] text-emerald"><CheckCircle2 className="h-3 w-3" /> Parsed</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Parsing…</span>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none border-0 p-0 gap-0 overflow-hidden flex flex-col glass-panel">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 pt-6 pb-8 sm:pt-10">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl sm:text-3xl flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/15 border border-emerald/30"><Layers className="h-4.5 w-4.5 text-emerald" /></span>
                Bulk Résumé Intake
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Drop many résumés at once. Set defaults below — they apply to every file but stay editable per candidate. PDF, Word (.docx), or images.</p>
            </DialogHeader>

            {/* Default assignment bar */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <div>
                <Label className="text-[10px]">Default office</Label>
                <select value={defLocation} onChange={(e) => setDefLocation(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default requisition</Label>
                <select value={defPosition} onChange={(e) => setDefPosition(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  <option value="">— none —</option>
                  {locPositions(defLocation).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default source</Label>
                <select value={defSource} onChange={(e) => setDefSource(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm mt-1">
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Default tags</Label>
                <Input value={defTags} onChange={(e) => setDefTags(e.target.value)} placeholder="HIPAA, bilingual…" className="h-9 mt-1" />
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
                <p className="text-sm font-medium text-foreground">Drop résumés here or click to select many</p>
                <p className="text-[11px] text-muted-foreground">We upload the originals, parse each one, and flag likely duplicates <Sparkles className="inline h-3 w-3 text-gold" /></p>
              </div>
            </div>

            {/* Review grid */}
            {rows.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    <Users className="inline h-3.5 w-3.5 mr-1" />
                    {parsedRows.length} parsed · {readyToCommit.length} to add
                    {dupCount > 0 && <span className="text-gold"> · {dupCount} possible duplicate{dupCount > 1 ? "s" : ""}</span>}
                  </p>
                  <button onClick={() => setRows([])} className="text-[11px] text-muted-foreground hover:text-destructive">Clear all</button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60">
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
                            {r.error && <p className="text-[9px] text-destructive max-w-[120px] leading-tight mt-0.5">{r.error}</p>}
                            <p className="text-[9px] text-muted-foreground truncate max-w-[120px] flex items-center gap-1 mt-0.5"><FileText className="h-2.5 w-2.5 shrink-0" />{r.file.name}</p>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.full_name} onChange={(e) => update(r.id, { full_name: e.target.value })} className="h-8 w-36 text-xs" disabled={r.status !== "parsed"} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.email} onChange={(e) => update(r.id, { email: e.target.value })} className="h-8 w-40 text-xs" disabled={r.status !== "parsed"} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input value={r.phone} onChange={(e) => update(r.id, { phone: e.target.value })} className="h-8 w-28 text-xs" disabled={r.status !== "parsed"} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.location_id} onChange={(e) => update(r.id, { location_id: e.target.value, position_id: "" })} className="h-8 w-32 rounded-md border border-input bg-background px-1.5 text-xs" disabled={r.status !== "parsed"}>
                              <option value="">—</option>
                              {locations.map((l) => <option key={l.id} value={l.id}>{l.site_name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.position_id} onChange={(e) => update(r.id, { position_id: e.target.value })} className="h-8 w-36 rounded-md border border-input bg-background px-1.5 text-xs" disabled={r.status !== "parsed"}>
                              <option value="">—</option>
                              {locPositions(r.location_id).map((p) => <option key={p.id} value={p.id}>{p.req_code ? `${p.req_code} · ` : ""}{p.title}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <select value={r.source} onChange={(e) => update(r.id, { source: e.target.value })} className="h-8 w-28 rounded-md border border-input bg-background px-1.5 text-xs" disabled={r.status !== "parsed"}>
                              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 align-top">
                            {r.dupOf ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[9px] text-gold"><Copy className="h-2.5 w-2.5" /> Matches {r.dupOf.full_name}</span>
                                <select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as RowAction })} className="h-7 w-32 rounded-md border border-input bg-background px-1.5 text-[11px]">
                                  <option value="merge">Merge into existing</option>
                                  <option value="create">Create new anyway</option>
                                  <option value="skip">Skip</option>
                                </select>
                              </div>
                            ) : (
                              <select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as RowAction })} className="h-7 w-24 rounded-md border border-input bg-background px-1.5 text-[11px]" disabled={r.status !== "parsed"}>
                                <option value="create">Add new</option>
                                <option value="skip">Skip</option>
                              </select>
                            )}
                          </td>
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
        <div className="shrink-0 border-t border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-6xl flex gap-2 px-4 sm:px-8 py-3 justify-end items-center">
            {busy && <span className="text-[11px] text-muted-foreground mr-auto inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Parsing résumés…</span>}
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} className="h-10">Cancel</Button>
            <Button onClick={commit} disabled={committing || busy || !readyToCommit.length} className="h-10 bg-emerald text-primary-foreground hover:bg-emerald/90 shadow-[0_0_24px_-8px_hsl(var(--emerald))]">
              {committing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add {readyToCommit.length || ""} to Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
