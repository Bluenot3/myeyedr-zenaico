import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { makeHash, stageProgress } from "@/lib/recruiting";

/* ============================ Types ============================ */
export interface Location {
  id: string;
  region: string;
  site_name: string;
  manager: string;
  active: boolean;
  city: string;
  state: string;
  phone: string;
  created_at: string;
}

export interface PostingLocation {
  label: string;
  url: string;
}

export interface Position {
  id: string;
  title: string;
  location_id: string | null;
  region: string;
  department: string;
  employment_type: string;
  openings: number;
  status: string;
  priority: string;
  description: string;
  requirements: string;
  pay_range: string;
  posting_url: string;
  posting_locations: PostingLocation[];
  created_at: string;
  updated_at: string;
}

export interface InterviewEvent {
  id: string;
  candidate_id: string | null;
  position_id: string | null;
  location_id: string | null;
  title: string;
  event_type: string; // screening | interview | hire | offer | other
  starts_at: string;
  ends_at: string | null;
  status: string; // scheduled | completed | canceled
  mode: string;
  location_detail: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position_id: string | null;
  applied_role: string;
  region: string;
  location_id: string | null;
  stage: string;
  status: string;
  score: number;
  rating: number;
  source: string;
  resume_url: string;
  in_talent_pool: boolean;
  talent_pool_reason: string;
  best_fit_roles: string;
  last_contacted_at: string | null;
  last_contacted_by: string;
  contact_count: number;
  tags: string[];
  headline: string;
  years_experience: number;
  documents: CandidateDocument[];
  created_at: string;
  updated_at: string;
}

export interface CandidateDocument {
  name: string;
  url: string;
  type: string;
  size: number;
  kind: "resume" | "attachment";
}

export interface CandidateBadge {
  id: string;
  candidate_id: string;
  badge_type: string;
  title: string;
  status: string;
  block_index: number;
  hash: string;
  prev_hash: string;
  score: number | null;
  summary: string;
  detail: Record<string, unknown>;
  file_url: string;
  issued_by: string;
  issued_at: string;
}

export interface ContactEntry {
  id: string;
  candidate_id: string;
  method: string;
  direction: string;
  contacted_by: string;
  outcome: string;
  notes: string;
  created_at: string;
}

export interface CandidateNote {
  id: string;
  candidate_id: string;
  author: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export interface ScreeningTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  criteria: { label: string; weight: number; guidance?: string }[];
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  role: string;
  difficulty: string;
  guidance: string;
  created_at: string;
}

const db = supabase as any;

/* ============================ Queries ============================ */
export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await db.from("locations").select("*").order("region").order("site_name");
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await db.from("positions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Position[];
    },
  });
}

export function useCandidates() {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await db.from("candidates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Candidate[];
    },
  });
}

export function useCandidateBadges(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_badges", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_badges")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("block_index", { ascending: true });
      if (error) throw error;
      return data as CandidateBadge[];
    },
    enabled: !!candidateId,
  });
}

export function useContactLog(candidateId: string | null) {
  return useQuery({
    queryKey: ["contact_log", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("contact_log")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactEntry[];
    },
    enabled: !!candidateId,
  });
}

export function useCandidateNotes(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_notes", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_notes")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateNote[];
    },
    enabled: !!candidateId,
  });
}

export function useScreeningTemplates() {
  return useQuery({
    queryKey: ["screening_templates"],
    queryFn: async () => {
      const { data, error } = await db.from("screening_templates").select("*").order("category");
      if (error) throw error;
      return data as ScreeningTemplate[];
    },
  });
}

export function useInterviewQuestions() {
  return useQuery({
    queryKey: ["interview_questions"],
    queryFn: async () => {
      const { data, error } = await db.from("interview_questions").select("*").order("category");
      if (error) throw error;
      return data as InterviewQuestion[];
    },
  });
}

/* ============================ Candidate mutations ============================ */
export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Candidate>) => {
      const { data, error } = await db.from("candidates").insert([c]).select().single();
      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate added to pipeline");
    },
    onError: (e: any) => toast.error("Failed to add candidate: " + e.message),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await db.from("candidates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e: any) => toast.error("Update failed: " + e.message),
  });
}

export function useBulkUpdateCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Candidate> }) => {
      const { error } = await db.from("candidates").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(`Updated ${vars.ids.length} candidate(s)`);
    },
    onError: (e: any) => toast.error("Bulk update failed: " + e.message),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate removed");
    },
    onError: (e: any) => toast.error("Delete failed: " + e.message),
  });
}

/** Advance stage and mint a ledger badge for the milestone. */
export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidate, toStage }: { candidate: Candidate; toStage: string }) => {
      const { error } = await db
        .from("candidates")
        .update({ stage: toStage, score: Math.max(candidate.score, stageProgress(toStage)) })
        .eq("id", candidate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e: any) => toast.error("Failed to advance: " + e.message),
  });
}

/* ============================ Ledger (badge) mutations ============================ */
export function useAddBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      badge_type: string;
      title: string;
      status?: string;
      score?: number | null;
      summary?: string;
      detail?: Record<string, unknown>;
      file_url?: string;
      issued_by?: string;
    }) => {
      const { data: existing, error: exErr } = await db
        .from("candidate_badges")
        .select("hash, block_index")
        .eq("candidate_id", payload.candidate_id)
        .order("block_index", { ascending: false })
        .limit(1);
      if (exErr) throw exErr;
      const prev = existing?.[0];
      const block_index = (prev?.block_index ?? 0) + 1;
      const prev_hash = prev?.hash ?? "0000000000000000000000000000000000000000";
      const { error } = await db.from("candidate_badges").insert([
        {
          candidate_id: payload.candidate_id,
          badge_type: payload.badge_type,
          title: payload.title,
          status: payload.status ?? "verified",
          score: payload.score ?? null,
          summary: payload.summary ?? "",
          detail: payload.detail ?? {},
          file_url: payload.file_url ?? "",
          issued_by: payload.issued_by ?? "Administrator",
          block_index,
          hash: makeHash(),
          prev_hash,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_badges", vars.candidate_id] });
      toast.success("Credential sealed to ledger");
    },
    onError: (e: any) => toast.error("Failed to seal credential: " + e.message),
  });
}

/* ============================ Contact + notes ============================ */
export function useLogContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      method: string;
      outcome: string;
      notes: string;
      contacted_by?: string;
      contact_count: number;
    }) => {
      const { error } = await db.from("contact_log").insert([
        {
          candidate_id: payload.candidate_id,
          method: payload.method,
          outcome: payload.outcome,
          notes: payload.notes,
          contacted_by: payload.contacted_by ?? "Administrator",
        },
      ]);
      if (error) throw error;
      const { error: upErr } = await db
        .from("candidates")
        .update({
          last_contacted_at: new Date().toISOString(),
          last_contacted_by: payload.contacted_by ?? "Administrator",
          contact_count: payload.contact_count + 1,
        })
        .eq("id", payload.candidate_id);
      if (upErr) throw upErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contact_log", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Contact logged");
    },
    onError: (e: any) => toast.error("Failed to log contact: " + e.message),
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { candidate_id: string; body: string; pinned?: boolean }) => {
      const { error } = await db.from("candidate_notes").insert([payload]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_notes", vars.candidate_id] });
      toast.success("Note added");
    },
    onError: (e: any) => toast.error("Failed to add note: " + e.message),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, candidate_id, ...updates }: { id: string; candidate_id: string; pinned?: boolean; body?: string }) => {
      const { error } = await db.from("candidate_notes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_notes", vars.candidate_id] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; candidate_id: string }) => {
      const { error } = await db.from("candidate_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_notes", vars.candidate_id] });
      toast.success("Note removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Positions & locations ============================ */
export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Position>) => {
      const { error } = await db.from("positions").insert([p]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Opening created");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Position> & { id: string }) => {
      const { error } = await db.from("positions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Opening updated");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: Partial<Location>) => {
      const { error } = await db.from("locations").insert([loc]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Location> & { id: string }) => {
      const { error } = await db.from("locations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Templates & questions ============================ */
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<ScreeningTemplate>) => {
      const { error } = await db.from("screening_templates").insert([t]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening_templates"] });
      toast.success("Template saved");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Partial<InterviewQuestion>) => {
      const { error } = await db.from("interview_questions").insert([q]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_questions"] });
      toast.success("Question added to bank");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("interview_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_questions"] });
      toast.success("Question removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Interview / calendar events ============================ */
export function useInterviewEvents() {
  return useQuery({
    queryKey: ["interview_events"],
    queryFn: async () => {
      const { data, error } = await db.from("interview_events").select("*").order("starts_at", { ascending: true });
      if (error) throw error;
      return data as InterviewEvent[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<InterviewEvent>) => {
      const { data, error } = await db.from("interview_events").insert([e]).select().single();
      if (error) throw error;
      return data as InterviewEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      toast.success("Event scheduled");
    },
    onError: (e: any) => toast.error("Failed to schedule: " + e.message),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InterviewEvent> & { id: string }) => {
      const { error } = await db.from("interview_events").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      toast.success("Event updated");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("interview_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      toast.success("Event removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}
