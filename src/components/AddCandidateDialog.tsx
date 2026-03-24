import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Loader2 } from "lucide-react";
import { useCreateCandidate, useUploadDocument, computePhase } from "@/hooks/useCandidates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const regions = ["DC", "Maryland", "Virginia", "Virtual"];

const sitesByRegion: Record<string, string[]> = {
  DC: ["FBR Club", "George M. Ferris Clubhouse #6", "Richard England Clubhouse #14", "Jelleff Community Center"],
  Maryland: ["Benjamin Stoddert MS", "Charles Carroll MS", "Drew Freeman MS", "James Gholson MS", "Nicolas Orem MS", "Oxon Hill MS", "Palmer Park Rec Center", "Galway Elementary", "Germantown Club", "Germantown Elementary"],
  Virginia: ["Dunbar Alexandria Olympic Club", "Bailey's BGC", "Murraygate Village Club", "Hylton Club", "Martin K. Alloy Club", "Heiser Club", "Ox-Hill Club", "Annandale Club"],
  Virtual: ["Clubhouse @ Your House"],
};

export default function AddCandidateDialog() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [paFile, setPaFile] = useState<File | null>(null);
  const createCandidate = useCreateCandidate();
  const uploadDoc = useUploadDocument();

  const [form, setForm] = useState({
    candidate_name: "",
    position: "",
    region: "DC",
    site: "",
    hiring_manager: "",
    requisition_id: "",
    clearance_type: "",
    dc_suitability_needed: false,
  });

  const updateField = (key: string, value: string | boolean) => {
    setForm((p) => {
      const next = { ...p, [key]: value };
      if (key === "region") {
        next.site = "";
        next.dc_suitability_needed = value === "DC";
        next.clearance_type =
          value === "DC" ? "DC CPR + Suitability" :
          value === "Maryland" ? "MD CPS" :
          value === "Virginia" ? "VA State Licensing" : "";
      }
      return next;
    });
  };

  const handlePAUpload = useCallback(async (file: File) => {
    setParsing(true);
    setPaFile(file);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("parse-pa-form", {
        body: { fileBase64: base64, fileName: file.name },
      });

      if (error) throw error;
      if (data?.data) {
        const parsed = data.data;
        setForm((p) => ({
          ...p,
          candidate_name: parsed.candidate_name || p.candidate_name,
          position: parsed.position || p.position,
          region: parsed.region || p.region,
          site: parsed.site || p.site,
          hiring_manager: parsed.hiring_manager || p.hiring_manager,
          requisition_id: parsed.requisition_id || p.requisition_id,
          clearance_type: parsed.clearance_type || p.clearance_type,
          dc_suitability_needed: parsed.dc_suitability_needed ?? p.dc_suitability_needed,
        }));
        toast.success("PA form parsed — please verify the details");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not parse PA form. Please enter details manually.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!form.candidate_name.trim()) {
      toast.error("Candidate name is required");
      return;
    }
    const phase = computePhase({});
    const result = await createCandidate.mutateAsync({
      ...form,
      current_phase: phase,
    });

    // If PA file was uploaded, attach it to the candidate
    if (paFile && result?.id) {
      await uploadDoc.mutateAsync({
        candidateId: result.id,
        file: paFile,
        documentType: "pa_form",
      });
    }

    setOpen(false);
    setForm({
      candidate_name: "",
      position: "",
      region: "DC",
      site: "",
      hiring_manager: "",
      requisition_id: "",
      clearance_type: "",
      dc_suitability_needed: false,
    });
    setPaFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Candidate</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload PA Form
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handlePAUpload(file);
              }}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Parsing PA form with AI…</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Drop PA form here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePAUpload(file);
                    }}
                  />
                </>
              )}
            </div>
            {paFile && !parsing && (
              <p className="text-xs text-success font-medium">✓ {paFile.name} parsed</p>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Enter candidate details manually below.
            </p>
          </TabsContent>
        </Tabs>

        {/* Form fields always visible */}
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Candidate Name *</Label>
              <Input
                value={form.candidate_name}
                onChange={(e) => updateField("candidate_name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Position</Label>
              <Input
                value={form.position}
                onChange={(e) => updateField("position", e.target.value)}
                placeholder="Job title"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Region</Label>
              <select
                value={form.region}
                onChange={(e) => updateField("region", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Site</Label>
              <select
                value={form.site}
                onChange={(e) => updateField("site", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select site…</option>
                {(sitesByRegion[form.region] || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hiring Manager</Label>
              <Input
                value={form.hiring_manager}
                onChange={(e) => updateField("hiring_manager", e.target.value)}
                placeholder="Manager name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Requisition ID</Label>
              <Input
                value={form.requisition_id}
                onChange={(e) => updateField("requisition_id", e.target.value)}
                placeholder="REQ-2025-XXXX"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createCandidate.isPending || !form.candidate_name.trim()}
          >
            {createCandidate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Add Candidate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
