import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Trash2, ExternalLink, Save, Loader2 } from "lucide-react";
import {
  Candidate,
  CandidateDocument,
  useCandidateDocuments,
  useUpdateCandidate,
  useUploadDocument,
  useDeleteCandidate,
  computePhase,
  getPhaseProgress,
} from "@/hooks/useCandidates";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const phaseLabels: Record<number, string> = {
  1: "Requisition Ready",
  2: "Offer Sent",
  3: "Docs Returned",
  4: "Background Check",
  5: "Clearances",
  6: "ADP Registration",
  7: "NVO",
  8: "Cleared to Start",
};

const docTypes = [
  { value: "pa_form", label: "PA Form" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "signed_offer", label: "Signed Offer Letter" },
  { value: "id_document", label: "ID Document" },
  { value: "background_check", label: "Background Check" },
  { value: "clearance", label: "Clearance Doc" },
  { value: "mandated_reporter", label: "Mandated Reporter Cert" },
  { value: "other", label: "Other" },
];

const toggleFields = [
  { key: "offer_packet_sent", label: "Offer Packet Sent", phase: 2 },
  { key: "offer_packet_returned", label: "Offer Packet Returned", phase: 3 },
  { key: "ids_received", label: "IDs Received", phase: 3 },
  { key: "background_check_sent", label: "Background Check Sent", phase: 4 },
  { key: "background_check_complete", label: "Background Check Complete", phase: 4 },
  { key: "mandated_reporter_complete", label: "Mandated Reporter Complete", phase: 5 },
  { key: "dc_suitability_complete", label: "DC Suitability Complete", phase: 5, condition: "dc_suitability_needed" },
  { key: "adp_registration_sent", label: "ADP Registration Sent", phase: 6 },
  { key: "adp_registration_complete", label: "ADP Registration Complete", phase: 6 },
  { key: "nvo_complete", label: "NVO Complete", phase: 7 },
] as const;

interface Props {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CandidateDetailSheet({ candidate, open, onOpenChange }: Props) {
  const [form, setForm] = useState<Partial<Candidate>>({});
  const [uploadType, setUploadType] = useState("other");
  const { data: docs = [] } = useCandidateDocuments(candidate?.id ?? null);
  const updateCandidate = useUpdateCandidate();
  const uploadDoc = useUploadDocument();
  const deleteCandidate = useDeleteCandidate();

  useEffect(() => {
    if (candidate) setForm({ ...candidate });
  }, [candidate]);

  if (!candidate) return null;

  const progress = getPhaseProgress(candidate);

  const handleToggle = (key: string, value: boolean) => {
    setForm((p) => {
      const next = { ...p, [key]: value };
      next.current_phase = computePhase(next as Partial<Candidate>);
      return next;
    });
  };

  const handleSave = async () => {
    if (!candidate) return;
    const { id, created_at, updated_at, ...updates } = form;
    await updateCandidate.mutateAsync({ id: candidate.id, ...updates });
  };

  const handleFileUpload = async (file: File) => {
    if (!candidate) return;
    await uploadDoc.mutateAsync({
      candidateId: candidate.id,
      file,
      documentType: uploadType,
    });
  };

  const getDocUrl = (doc: CandidateDocument) => {
    const { data } = supabase.storage
      .from("candidate-documents")
      .getPublicUrl(doc.file_path);
    return data.publicUrl;
  };

  const handleDelete = async () => {
    if (!candidate) return;
    await deleteCandidate.mutateAsync(candidate.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-xl">{candidate.candidate_name}</SheetTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{candidate.position}</Badge>
            <Badge variant="secondary" className="text-xs">{candidate.region} · {candidate.site}</Badge>
          </div>
        </SheetHeader>

        {/* Progress Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-accent">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Phase {candidate.current_phase}: {phaseLabels[candidate.current_phase]}
          </p>
        </div>

        <Separator />

        {/* Editable fields */}
        <div className="space-y-4 py-4">
          <h3 className="text-sm font-semibold font-display">Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Hiring Manager</Label>
              <Input
                value={form.hiring_manager || ""}
                onChange={(e) => setForm((p) => ({ ...p, hiring_manager: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Requisition ID</Label>
              <Input
                value={form.requisition_id || ""}
                onChange={(e) => setForm((p) => ({ ...p, requisition_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NVO Date</Label>
              <Input
                type="date"
                value={form.nvo_date || ""}
                onChange={(e) => setForm((p) => ({ ...p, nvo_date: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">First Day</Label>
              <Input
                type="date"
                value={form.first_day_confirmed || ""}
                onChange={(e) => setForm((p) => ({ ...p, first_day_confirmed: e.target.value || null }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Blocker / Notes</Label>
            <textarea
              value={form.blocker_notes || ""}
              onChange={(e) => setForm((p) => ({ ...p, blocker_notes: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
              placeholder="Any blockers or notes…"
            />
          </div>
        </div>

        <Separator />

        {/* Phase Toggles */}
        <div className="space-y-3 py-4">
          <h3 className="text-sm font-semibold font-display">Onboarding Milestones</h3>
          {toggleFields.map((field) => {
            if (field.condition && !(form as Record<string, unknown>)[field.condition]) return null;
            return (
              <div key={field.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground w-5">P{field.phase}</span>
                  <span className="text-sm">{field.label}</span>
                </div>
                <Switch
                  checked={!!(form as Record<string, unknown>)[field.key]}
                  onCheckedChange={(v) => handleToggle(field.key, v)}
                />
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Documents */}
        <div className="space-y-3 py-4">
          <h3 className="text-sm font-semibold font-display">Documents</h3>
          {docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {doc.document_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <a
                    href={getDocUrl(doc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
          )}

          <div className="flex items-center gap-2">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs flex-1"
            >
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="cursor-pointer">
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <span>
                  <Upload className="h-3.5 w-3.5" /> Upload
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove candidate?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {candidate.candidate_name} and all their documents.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={updateCandidate.isPending} className="gap-1.5">
            {updateCandidate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
