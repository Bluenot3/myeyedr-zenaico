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
  req_code: string;
  hiring_manager: string;
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
  address: string;
  current_employer: string;
  work_history: { employer?: string; title?: string; dates?: string }[];
  education: { school?: string; credential?: string; dates?: string }[];
  certifications: string[];
  resume_summary: string;
  resume_text: string;
  parse_confidence: number | null;
  screening_status: string;
  interview_status: string;
  documents: CandidateDocument[];
  created_at: string;
  updated_at: string;
}

export interface CandidateRequisition {
  id: string;
  candidate_id: string;
  position_id: string | null;
  location_id: string | null;
  stage: string;
  status: string;
  source: string;
  is_primary: boolean;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  title: string;
  detail: Record<string, unknown>;
  requisition_id: string | null;
  location_id: string | null;
  actor: string;
  created_at: string;
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

export interface Competency {
  id: string;
  label: string;
  weight: number;
  guidance: string;
  // Rich interview / phone-screen fields (optional; used by interactive forms)
  title?: string;
  area?: string;
  evidence?: string;
  q1?: string;
  q2?: string;
  quick?: string;
  lookFor?: string;
  anchors?: string;
  redFlags?: string;
}

export type TemplateKind = "scorecard" | "interview" | "phone_screen";

export interface ScorecardTemplate {
  id: string;
  name: string;
  role: string;
  position_id: string | null;
  description: string;
  kind: TemplateKind;
  competencies: Competency[];
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationRating {
  id: string;
  label: string;
  score: number; // 0 (unrated) .. 5 (star flow) or 0..4 (interview flow)
  comment: string;
}

export interface EvaluationDetails {
  kind?: TemplateKind;
  scale?: number; // max per-competency score (4 for interview forms, 5 for star)
  total?: number; // raw total
  maxTotal?: number;
  recLabel?: string; // Strong Hire / Hireable / ...
  risks?: Record<string, string>;
  finalDecision?: string;
  bestReason?: string;
  biggestConcern?: string;
  trainingPriority?: string;
  managerInitials?: string;
  location?: string;
  interviewDate?: string;
}

export interface CandidateEvaluation {
  id: string;
  candidate_id: string;
  template_id: string | null;
  event_id: string | null;
  position_id: string | null;
  template_name: string;
  evaluator: string;
  ratings: EvaluationRating[];
  overall_score: number;
  recommendation: string; // strong_yes | yes | neutral | no | strong_no
  notes: string;
  details?: EvaluationDetails;
  submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Soundbite {
  quote: string;
  label: string; // strength | concern | skill | red_flag | logistics | culture
  note: string;
  start: number | null;
  end: number | null;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

export interface CandidateMedia {
  id: string;
  candidate_id: string;
  name: string;
  url: string;
  media_type: string; // audio | video | image | document
  content_type: string | null;
  size: number;
  label: string | null;
  duration_seconds: number | null;
  status: string; // processing | ready | error
  transcript: string | null;
  words: TranscriptWord[];
  soundbites: Soundbite[];
  summary: string | null;
  sentiment: string | null;
  recommendation: string | null;
  fit_score: number | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateSignal {
  category: string;
  title: string;
  severity: "low" | "medium" | "high";
  observation: string;
  why_it_matters: string;
  questions: string[];
}

export interface CandidateSignals {
  id: string;
  candidate_id: string;
  risk_level: "low" | "medium" | "high" | "unknown";
  headline: string;
  summary: string;
  signals: CandidateSignal[];
  model: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
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
      const cand = data as Candidate;
      // Record the initial application + timeline event so history exists from day one.
      await db.from("candidate_requisitions").insert([{
        candidate_id: cand.id,
        position_id: cand.position_id,
        location_id: cand.location_id,
        source: cand.source ?? "",
        stage: cand.stage ?? "applied",
        status: "active",
        is_primary: true,
        created_by: "Administrator",
      }]);
      await db.from("candidate_events").insert([{
        candidate_id: cand.id,
        event_type: "applied",
        title: "Candidate created",
        requisition_id: cand.position_id,
        location_id: cand.location_id,
        actor: "Administrator",
      }]);
      return cand;
    },
    onSuccess: (_d, _v, ) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidate_requisitions", "all"] });
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

/* ============================ Candidate media (interviews / uploads) ============================ */
export function useCandidateMedia(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_media", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_media")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateMedia[];
    },
    enabled: !!candidateId,
  });
}

export function useCreateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<CandidateMedia>) => {
      const { data, error } = await db.from("candidate_media").insert([m]).select().single();
      if (error) throw error;
      return data as CandidateMedia;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_media", vars.candidate_id] });
    },
    onError: (e: any) => toast.error("Upload failed: " + e.message),
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CandidateMedia> & { id: string }) => {
      const { error } = await db.from("candidate_media").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_media", vars.candidate_id] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; candidate_id: string }) => {
      const { error } = await db.from("candidate_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_media", vars.candidate_id] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/** Kick off interview transcription + soundbite analysis for a media row. */
export function useAnalyzeInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { mediaId: string; candidateId: string; url: string; candidate?: Partial<Candidate> }) => {
      const { data, error } = await supabase.functions.invoke("analyze-interview", {
        body: {
          mediaId: payload.mediaId,
          candidateId: payload.candidateId,
          url: payload.url,
          candidate: payload.candidate,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_media", vars.candidateId] });
      toast.success("Interview analyzed — soundbites ready");
    },
    onError: (e: any) => toast.error("Analysis failed: " + (e?.message || e)),
  });
}

/* ===================== Candidate signals (AI pattern scan) ===================== */
export function useCandidateSignals(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_signals", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await db
        .from("candidate_signals").select("*").eq("candidate_id", candidateId).maybeSingle();
      if (error) throw error;
      return (data as CandidateSignals) || null;
    },
  });
}

export function useAnalyzeCandidateSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { candidateId: string; evaluatorName?: string }) => {
      const { data, error } = await supabase.functions.invoke("analyze-candidate-signals", {
        body: { candidateId: payload.candidateId, evaluatorName: payload.evaluatorName },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).signals as CandidateSignals;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_signals", vars.candidateId] });
      toast.success("Signal scan complete");
    },
    onError: (e: any) => toast.error("Scan failed: " + (e?.message || e)),
  });
}



/* ============================ Scorecard templates ============================ */
export function useScorecardTemplates() {
  return useQuery({
    queryKey: ["scorecard_templates"],
    queryFn: async () => {
      const { data, error } = await db.from("scorecard_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScorecardTemplate[];
    },
  });
}

export function useCreateScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<ScorecardTemplate>) => {
      const { data, error } = await db.from("scorecard_templates").insert([t]).select().single();
      if (error) throw error;
      return data as ScorecardTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecard_templates"] });
      toast.success("Scorecard template saved");
    },
    onError: (e: any) => toast.error("Failed to save template: " + e.message),
  });
}

export function useUpdateScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScorecardTemplate> & { id: string }) => {
      const { error } = await db.from("scorecard_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecard_templates"] });
      toast.success("Template updated");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteScorecardTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("scorecard_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecard_templates"] });
      toast.success("Template removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Candidate evaluations (filled scorecards) ============================ */
export function useCandidateEvaluations(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_evaluations", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_evaluations")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateEvaluation[];
    },
    enabled: !!candidateId,
  });
}

/** All evaluations the current user can access (RLS-scoped) — powers the admin/regional summary. */
export function useRecentEvaluations(limit = 200, enabled = true) {
  return useQuery({
    queryKey: ["recent_evaluations", limit],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("candidate_evaluations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as CandidateEvaluation[];
    },
  });
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<CandidateEvaluation>) => {
      const { data, error } = await db.from("candidate_evaluations").insert([e]).select().single();
      if (error) throw error;
      return data as CandidateEvaluation;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_evaluations", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["recent_evaluations"] });
      toast.success("Evaluation saved to candidate");
    },
    onError: (e: any) => toast.error("Failed to save evaluation: " + e.message),
  });
}

export function useUpdateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CandidateEvaluation> & { id: string }) => {
      const { error } = await db.from("candidate_evaluations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_evaluations", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["recent_evaluations"] });
      toast.success("Evaluation updated");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; candidate_id: string }) => {
      const { error } = await db.from("candidate_evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_evaluations", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["recent_evaluations"] });
      toast.success("Evaluation removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Golden profiles (ideal candidate) ============================ */
import type { GoldenProfile } from "@/lib/golden";

export function useGoldenProfiles() {
  return useQuery({
    queryKey: ["golden_profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("golden_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as GoldenProfile[];
    },
  });
}

export function useSaveGoldenProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: Partial<GoldenProfile> & { id?: string }) => {
      if (g.id) {
        const { id, created_at, updated_at, ...updates } = g as any;
        const { data, error } = await db.from("golden_profiles").update(updates).eq("id", id).select().single();
        if (error) throw error;
        return data as GoldenProfile;
      }
      const { data, error } = await db.from("golden_profiles").insert([g]).select().single();
      if (error) throw error;
      return data as GoldenProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golden_profiles"] });
      toast.success("Golden example saved");
    },
    onError: (e: any) => toast.error("Failed to save golden example: " + e.message),
  });
}

export function useDeleteGoldenProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("golden_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golden_profiles"] });
      toast.success("Golden example removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export async function generateGoldenProfile(opts: {
  mode: "from_position" | "from_resume" | "from_candidate";
  role?: string;
  context?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<Partial<GoldenProfile>> {
  const { data, error } = await supabase.functions.invoke("generate-golden-profile", { body: opts });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.profile as Partial<GoldenProfile>;
}

/* ============================ Hiring decisions (cloud-persisted verdicts) ============================ */
export interface HiringDecision {
  id: string;
  candidate_id: string;
  position_id: string | null;
  location_id: string | null;
  golden_id: string | null;
  decision: "hire" | "hold" | "pass";
  power_score: number | null;
  fit_score: number | null;
  contenders: any[];
  weights: Record<string, number>;
  rationale: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// All decisions the signed-in user can see (RLS-scoped). Powers team-wide visibility.
export function useHiringDecisions(candidateId?: string | null) {
  return useQuery({
    queryKey: ["hiring_decisions", candidateId ?? "all"],
    queryFn: async () => {
      let q = db.from("hiring_decisions").select("*").order("created_at", { ascending: false });
      if (candidateId) q = q.eq("candidate_id", candidateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HiringDecision[];
    },
  });
}

export function useRecordDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Partial<HiringDecision> & { candidate_id: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      let name = userRes.user?.email ?? null;
      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
        name = (prof as any)?.full_name || (prof as any)?.email || name;
      }
      const payload = { ...d, decided_by: uid, decided_by_name: name };
      const { data, error } = await db.from("hiring_decisions").insert([payload]).select().single();
      if (error) throw error;
      return data as HiringDecision;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["hiring_decisions"] });
      qc.invalidateQueries({ queryKey: ["hiring_decisions", row.candidate_id] });
      toast.success("Decision recorded to the team ledger");
    },
    onError: (e: any) => toast.error("Could not record decision: " + e.message),
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("hiring_decisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring_decisions"] });
      toast.success("Decision removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Onboarding (new-hire tracker) ============================ */
import {
  defaultOnboardingSteps, defaultTrainingSchedule, type OnboardingStep, type TrainingWeek,
} from "@/lib/onboarding";

export interface OnboardingRecord {
  id: string;
  candidate_id: string;
  location_id: string | null;
  status: "in_progress" | "complete" | "paused";
  steps: OnboardingStep[];
  first_day_date: string | null;
  first_day_location_id: string | null;
  first_day_time: string;
  trainer_name: string;
  training_schedule: TrainingWeek[];
  offer_details: Record<string, any>;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** All onboarding records the signed-in user can see (RLS-scoped). Powers the dashboard. */
export function useAllOnboarding() {
  return useQuery({
    queryKey: ["onboarding", "all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("candidate_onboarding")
        .select("*")
        .order("first_day_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OnboardingRecord[];
    },
  });
}

export function useOnboarding(candidateId: string | null) {
  return useQuery({
    queryKey: ["onboarding", candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      const { data, error } = await db
        .from("candidate_onboarding")
        .select("*")
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as OnboardingRecord | null;
    },
    enabled: !!candidateId,
  });
}

/** Create the onboarding record if missing, otherwise patch it. */
export function useUpsertOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidate_id,
      updates,
      seedLocationId,
    }: {
      candidate_id: string;
      updates?: Partial<OnboardingRecord>;
      seedLocationId?: string | null;
    }) => {
      const { data: existing } = await db
        .from("candidate_onboarding")
        .select("id")
        .eq("candidate_id", candidate_id)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await db
          .from("candidate_onboarding")
          .update(updates ?? {})
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as OnboardingRecord;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      let name = userRes.user?.email ?? "";
      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
        name = (prof as any)?.full_name || (prof as any)?.email || name;
      }
      const payload = {
        candidate_id,
        location_id: seedLocationId ?? null,
        first_day_location_id: seedLocationId ?? null,
        steps: defaultOnboardingSteps(),
        training_schedule: defaultTrainingSchedule(),
        created_by: name,
        ...(updates ?? {}),
      };
      const { data, error } = await db.from("candidate_onboarding").insert([payload]).select().single();
      if (error) throw error;
      return data as OnboardingRecord;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["onboarding", row.candidate_id] });
      qc.invalidateQueries({ queryKey: ["onboarding", "all"] });
    },
    onError: (e: any) => toast.error("Onboarding save failed: " + e.message),
  });
}

/* ============================ Candidate lifecycle (hire / reject / pool / restore) ============================ */
export function useCandidateLifecycle() {
  const qc = useQueryClient();
  const upsertOnboarding = useUpsertOnboarding();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["onboarding", "all"] });
  };

  const mintBadge = async (candidate_id: string, badge_type: string, title: string, summary: string, status = "verified") => {
    const { data: existing } = await db
      .from("candidate_badges").select("hash, block_index").eq("candidate_id", candidate_id)
      .order("block_index", { ascending: false }).limit(1);
    const prev = existing?.[0];
    await db.from("candidate_badges").insert([{
      candidate_id, badge_type, title, status, summary, detail: {}, file_url: "",
      issued_by: "Administrator",
      block_index: (prev?.block_index ?? 0) + 1,
      hash: makeHash(),
      prev_hash: prev?.hash ?? "0000000000000000000000000000000000000000",
    }]);
  };

  const hire = useMutation({
    mutationFn: async (candidate: Candidate) => {
      const { error } = await db.from("candidates")
        .update({ stage: "hired", status: "hired", score: 100, in_talent_pool: false })
        .eq("id", candidate.id);
      if (error) throw error;
      await upsertOnboarding.mutateAsync({ candidate_id: candidate.id, seedLocationId: candidate.location_id });
      await mintBadge(candidate.id, "hired", "Hired", `${candidate.full_name} moved to onboarding.`);
    },
    onSuccess: () => { invalidate(); toast.success("Hired — onboarding checklist started"); },
    onError: (e: any) => toast.error("Hire failed: " + e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ candidate, reason }: { candidate: Candidate; reason: string }) => {
      const { error } = await db.from("candidates")
        .update({ stage: "rejected", status: "rejected" })
        .eq("id", candidate.id);
      if (error) throw error;
      await mintBadge(candidate.id, "note", "Rejected / Archived", reason || "Archived for future reference.", "flagged");
    },
    onSuccess: () => { invalidate(); toast.success("Candidate archived"); },
    onError: (e: any) => toast.error("Reject failed: " + e.message),
  });

  const pool = useMutation({
    mutationFn: async ({ candidate, reason, roles }: { candidate: Candidate; reason: string; roles: string }) => {
      const { error } = await db.from("candidates")
        .update({ in_talent_pool: true, talent_pool_reason: reason, best_fit_roles: roles || candidate.best_fit_roles })
        .eq("id", candidate.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Added to talent pool"); },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const restore = useMutation({
    mutationFn: async ({ candidate, toStage }: { candidate: Candidate; toStage: string }) => {
      const { error } = await db.from("candidates")
        .update({ stage: toStage, status: "active" })
        .eq("id", candidate.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Candidate reactivated"); },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  return { hire, reject, pool, restore };
}

/* ============================ Requisitions (applications) & events ============================ */
export function useCandidateRequisitions(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_requisitions", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_requisitions")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateRequisition[];
    },
    enabled: !!candidateId,
  });
}

export function useAllCandidateRequisitions() {
  return useQuery({
    queryKey: ["candidate_requisitions", "all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("candidate_requisitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateRequisition[];
    },
  });
}

export function useCandidateEvents(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate_events", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("candidate_events")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateEvent[];
    },
    enabled: !!candidateId,
  });
}

export function useLogEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CandidateEvent> & { candidate_id: string; event_type: string }) => {
      const { error } = await db.from("candidate_events").insert([payload]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_events", vars.candidate_id] });
    },
    onError: (e: any) => toast.error("Failed to log activity: " + e.message),
  });
}

/** Create an application (candidate <-> requisition link) + timeline event. */
export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      position_id: string | null;
      location_id: string | null;
      source?: string;
      stage?: string;
      is_primary?: boolean;
      created_by?: string;
      title?: string;
    }) => {
      const { error } = await db.from("candidate_requisitions").insert([{
        candidate_id: payload.candidate_id,
        position_id: payload.position_id,
        location_id: payload.location_id,
        source: payload.source ?? "",
        stage: payload.stage ?? "applied",
        status: "active",
        is_primary: payload.is_primary ?? true,
        created_by: payload.created_by ?? "Administrator",
      }]);
      if (error) throw error;
      await db.from("candidate_events").insert([{
        candidate_id: payload.candidate_id,
        event_type: "requisition_add",
        title: payload.title ?? "Assigned to requisition",
        requisition_id: payload.position_id,
        location_id: payload.location_id,
        actor: payload.created_by ?? "Administrator",
      }]);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate_requisitions", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["candidate_requisitions", "all"] });
      qc.invalidateQueries({ queryKey: ["candidate_events", vars.candidate_id] });
    },
    onError: (e: any) => toast.error("Failed to assign requisition: " + e.message),
  });
}

/**
 * Reassign a candidate's current (primary) requisition to a new one without
 * losing history: the prior application is demoted (kept), a new primary
 * application is created, and the candidate's pointer fields are updated.
 */
export function useReassignRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate: Candidate;
      position_id: string | null;
      location_id: string | null;
      region?: string;
      actor?: string;
      positionTitle?: string;
    }) => {
      const actor = payload.actor ?? "Administrator";
      // Demote existing primary applications for this candidate.
      await db.from("candidate_requisitions")
        .update({ is_primary: false })
        .eq("candidate_id", payload.candidate.id)
        .eq("is_primary", true);
      // New primary application.
      const { error } = await db.from("candidate_requisitions").insert([{
        candidate_id: payload.candidate.id,
        position_id: payload.position_id,
        location_id: payload.location_id,
        source: payload.candidate.source ?? "",
        stage: payload.candidate.stage ?? "applied",
        status: "active",
        is_primary: true,
        created_by: actor,
      }]);
      if (error) throw error;
      // Update the master candidate pointer.
      const { error: upErr } = await db.from("candidates")
        .update({
          position_id: payload.position_id,
          location_id: payload.location_id,
          ...(payload.region ? { region: payload.region } : {}),
        })
        .eq("id", payload.candidate.id);
      if (upErr) throw upErr;
      await db.from("candidate_events").insert([{
        candidate_id: payload.candidate.id,
        event_type: "assignment",
        title: payload.positionTitle ? `Reassigned to ${payload.positionTitle}` : "Requisition reassigned",
        requisition_id: payload.position_id,
        location_id: payload.location_id,
        actor,
      }]);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidate_requisitions", vars.candidate.id] });
      qc.invalidateQueries({ queryKey: ["candidate_requisitions", "all"] });
      qc.invalidateQueries({ queryKey: ["candidate_events", vars.candidate.id] });
      toast.success("Requisition reassigned — history preserved");
    },
    onError: (e: any) => toast.error("Reassign failed: " + e.message),
  });
}


