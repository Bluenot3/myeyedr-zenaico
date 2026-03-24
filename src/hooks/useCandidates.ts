import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Candidate {
  id: string;
  candidate_name: string;
  position: string;
  region: string;
  site: string;
  hiring_manager: string;
  requisition_id: string;
  offer_packet_sent: boolean;
  offer_packet_returned: boolean;
  ids_received: boolean;
  background_check_sent: boolean;
  background_check_complete: boolean;
  mandated_reporter_complete: boolean;
  clearance_type: string;
  dc_suitability_needed: boolean;
  dc_suitability_complete: boolean;
  adp_registration_sent: boolean;
  adp_registration_complete: boolean;
  nvo_date: string | null;
  nvo_complete: boolean;
  first_day_confirmed: string | null;
  blocker_notes: string;
  current_phase: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export interface Location {
  id: string;
  region: string;
  site_name: string;
  manager: string;
  active: boolean;
  created_at: string;
}

export function useCandidates() {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Candidate[];
    },
  });
}

export function useCandidateDocuments(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_documents", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("candidate_documents")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as CandidateDocument[];
    },
    enabled: !!candidateId,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("active", true)
        .order("region")
        .order("site_name");
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidate: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from("candidates")
        .insert([candidate as any])
        .select()
        .single();
      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added successfully");
    },
    onError: (e) => toast.error("Failed to add candidate: " + e.message),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from("candidates")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e) => toast.error("Failed to update: " + e.message),
  });
}

export function useBulkUpdateCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Candidate> }) => {
      const { error } = await supabase
        .from("candidates")
        .update(updates as any)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(`Updated ${vars.ids.length} candidate(s)`);
    },
    onError: (e) => toast.error("Bulk update failed: " + e.message),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate removed");
    },
    onError: (e) => toast.error("Failed to delete: " + e.message),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateId,
      file,
      documentType,
    }: {
      candidateId: string;
      file: File;
      documentType: string;
    }) => {
      const filePath = `${candidateId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("candidate_documents").insert({
        candidate_id: candidateId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
      } as any);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate_documents"] });
      toast.success("Document uploaded");
    },
    onError: (e) => toast.error("Upload failed: " + e.message),
  });
}

// Location mutations
export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: { region: string; site_name: string; manager?: string }) => {
      const { error } = await supabase.from("locations").insert(loc as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; manager?: string; active?: boolean; site_name?: string }) => {
      const { error } = await supabase.from("locations").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });
}

export function computePhase(c: Partial<Candidate>): number {
  if (c.first_day_confirmed && c.nvo_complete) return 8;
  if (c.nvo_date || c.nvo_complete) return 7;
  if (c.adp_registration_sent || c.adp_registration_complete) return 6;
  if (c.mandated_reporter_complete || c.dc_suitability_complete) return 5;
  if (c.background_check_sent || c.background_check_complete) return 4;
  if (c.offer_packet_returned || c.ids_received) return 3;
  if (c.offer_packet_sent) return 2;
  return 1;
}

export function getPhaseProgress(c: Candidate): number {
  const checks = [
    c.offer_packet_sent,
    c.offer_packet_returned,
    c.ids_received,
    c.background_check_sent,
    c.background_check_complete,
    c.mandated_reporter_complete,
    c.dc_suitability_needed ? c.dc_suitability_complete : true,
    c.adp_registration_sent,
    c.adp_registration_complete,
    c.nvo_complete,
    !!c.first_day_confirmed,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
