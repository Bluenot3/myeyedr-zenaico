import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, FileText, Loader2, Sparkles, Upload, X, Zap } from "lucide-react";
import {
  fileToBase64, loadSavedApplicant, saveApplicant, submitApplication, type PublicJob, type SavedApplicant,
} from "@/lib/careers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = talent-network application (no specific requisition) */
  job: PublicJob | null;
}

const MAX_MB = 8;

export default function ApplyDialog({ open, onOpenChange, job }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desired, setDesired] = useState("");
  const [years, setYears] = useState("");
  const [availability, setAvailability] = useState("");
  const [certs, setCerts] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [oneTapBusy, setOneTapBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [saved, setSaved] = useState<SavedApplicant | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setMore(false);
    const prev = loadSavedApplicant();
    setSaved(prev);
    if (prev) {
      setName((n) => n || prev.full_name);
      setEmail((e) => e || prev.email);
      setPhone((p) => p || prev.phone || "");
    }
  }, [open]);

  const reset = () => {
    setDesired(""); setYears("");
    setAvailability(""); setCerts(""); setMessage(""); setFile(null);
  };

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Please upload a résumé under ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const send = async (payloadName: string, payloadEmail: string, payloadPhone: string, withFile: File | null) => {
    const base = withFile ? await fileToBase64(withFile) : "";
    const res = await submitApplication({
      full_name: payloadName,
      email: payloadEmail,
      phone: payloadPhone,
      position_id: job?.id ?? null,
      desired_role: job ? job.title : desired,
      talent_pool: !job,
      message,
      availability,
      certifications: certs,
      years_experience: years ? Number(years) : 0,
      file_base64: base || undefined,
      file_name: withFile?.name,
      mime_type: withFile?.type || "application/pdf",
    });
    saveApplicant({
      full_name: payloadName,
      email: payloadEmail,
      phone: payloadPhone,
      resume_name: withFile?.name || saved?.resume_name,
    });
    setDone(res.message);
    reset();
  };

  const oneTap = async () => {
    if (!saved) return;
    setOneTapBusy(true);
    try {
      await send(saved.full_name, saved.email, saved.phone || "", null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setOneTapBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      await send(name, email, phone, file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto p-5 sm:p-6">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">You're in</h2>
            <p className="mt-2 text-sm text-muted-foreground">{done}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              A MyEyeDr hiring manager reviews every application personally — no résumé black hole. Next time,
              applying to another office takes one tap.
            </p>
            <Button className="mt-6 w-full" size="lg" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-xl sm:text-2xl">
                {job ? `Apply — ${job.title}` : "Join the talent network"}
              </DialogTitle>
              <DialogDescription>
                {job
                  ? "Goes straight to the hiring manager for this office. Under two minutes, no account required."
                  : "Tell us what you do best and we'll reach out when the right office opens a seat."}
              </DialogDescription>
            </DialogHeader>

            {saved && (
              <button
                type="button"
                onClick={oneTap}
                disabled={oneTapBusy || busy}
                className="group flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/12 active:scale-[0.99] disabled:opacity-70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  {oneTapBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {oneTapBusy ? "Sending…" : `One-tap apply as ${saved.full_name.split(" ")[0]}`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {saved.email}
                    {saved.resume_name ? ` · résumé on file` : ""}
                  </span>
                </span>
              </button>
            )}

            {saved && (
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* Fast path: résumé first, two fields, done. */}
              <div className="space-y-1.5">
                <Label>Résumé{saved?.resume_name ? " (replace the one on file)" : ""}</Label>
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground" aria-label="Remove résumé">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]">
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Upload your résumé</span>
                    <span className="text-xs text-muted-foreground">PDF, DOC or a photo · up to {MAX_MB} MB</span>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => pick(e.target.files?.[0] || null)} />
                  </label>
                )}
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                  We read it instantly so you never re-type your history into a form.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ap-name">Full name *</Label>
                  <Input id="ap-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reyes" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-email">Email *</Label>
                  <Input id="ap-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/30"
                aria-expanded={more}
              >
                <span className="text-sm font-medium text-foreground">
                  {more ? "Optional details" : "Add optional details"}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${more ? "rotate-180" : ""}`} />
              </button>

              {more && (
                <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-phone">Phone</Label>
                      <Input id="ap-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(215) 555-0134" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-years">Years in optical / healthcare</Label>
                      <Input id="ap-years" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/[^0-9]/g, ""))} placeholder="4" />
                    </div>
                  </div>

                  {!job && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-role">Role you're looking for</Label>
                      <Input id="ap-role" value={desired} onChange={(e) => setDesired(e.target.value)} placeholder="Optician, Patient Service Coordinator, Optometric Technician…" />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-avail">Availability</Label>
                      <Input id="ap-avail" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Weekdays + alternating Saturdays" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-certs">Licenses / certifications</Label>
                      <Input id="ap-certs" value={certs} onChange={(e) => setCerts(e.target.value)} placeholder="ABO, PA Optician license…" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ap-msg">Anything we should know?</Label>
                    <Textarea id="ap-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="What you love about patient care, schedule needs, offices you can reach…" />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={busy || oneTapBusy}>
                {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>) : job ? "Submit application" : "Join the talent network"}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Your information is used only for MyEyeDr hiring. Never sold, never posted to a job board.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
