import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

/* ============================ Types ============================ */
export interface ScreeningQuestion {
  text: string;
}

export interface ScreeningAgent {
  id: string;
  name: string;
  role_focus: string;
  persona: string;
  voice_id: string;
  voice_name: string;
  opening_line: string;
  closing_line: string;
  questions: string[];
  extraction_goals: string[];
  system_prompt: string;
  temperature: number;
  stability: number;
  similarity: number;
  active: boolean;
  color: string;
  runs: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedInfo {
  availability?: string;
  years_experience?: string;
  certifications?: string;
  salary_expectation?: string;
  start_date?: string;
  location_preference?: string;
  key_skills?: string[];
  notable_quotes?: string[];
}

export interface ScreeningTranscript {
  id: string;
  candidate_id: string;
  agent_id: string | null;
  source: string;
  title: string;
  transcript: string;
  duration_seconds: number;
  extracted: ExtractedInfo & { highlights?: string[]; concerns?: string[] };
  summary: string;
  sentiment: string;
  fit_score: number | null;
  recommendation: string;
  created_at: string;
}

export interface ScorecardDimension {
  label: string;
  score: number; // 0-100
  weight: number;
}

export interface CandidateScorecard {
  id: string;
  candidate_id: string;
  dimensions: ScorecardDimension[];
  overall_score: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  decision: string;
  evaluated_by: string;
  created_at: string;
  updated_at: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

/* ============================ Voices ============================ */
export function useVoices() {
  return useQuery({
    queryKey: ["elevenlabs_voices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-voices");
      if (error) throw error;
      return (data?.voices ?? []) as Voice[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export async function synthesizeSpeech(opts: {
  text: string;
  voiceId: string;
  stability?: number;
  similarity?: number;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
    body: opts,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return `data:audio/mpeg;base64,${data.audioBase64}`;
}

export async function agentReply(opts: {
  agent: Partial<ScreeningAgent>;
  messages: { role: string; content: string }[];
  candidate?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("agent-chat", { body: opts });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.reply as string;
}

export async function analyzeTranscript(opts: {
  transcript: string;
  candidate?: Record<string, unknown>;
  goals?: string[];
}) {
  const { data, error } = await supabase.functions.invoke("analyze-transcript", { body: opts });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.analysis;
}

/* ============================ Agents ============================ */
export function useAgents() {
  return useQuery({
    queryKey: ["screening_agents"],
    queryFn: async () => {
      const { data, error } = await db
        .from("screening_agents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScreeningAgent[];
    },
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Partial<ScreeningAgent>) => {
      const { data, error } = await db.from("screening_agents").insert([a]).select().single();
      if (error) throw error;
      return data as ScreeningAgent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening_agents"] });
      toast.success("Agent created");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScreeningAgent> & { id: string }) => {
      const { error } = await db.from("screening_agents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening_agents"] });
      toast.success("Agent saved");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("screening_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening_agents"] });
      toast.success("Agent deleted");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Transcripts ============================ */
export function useTranscripts(candidateId: string | null) {
  return useQuery({
    queryKey: ["screening_transcripts", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await db
        .from("screening_transcripts")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScreeningTranscript[];
    },
    enabled: !!candidateId,
  });
}

export function useAllTranscripts() {
  return useQuery({
    queryKey: ["screening_transcripts", "all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("screening_transcripts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScreeningTranscript[];
    },
  });
}

export function useSaveTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<ScreeningTranscript>) => {
      const { data, error } = await db.from("screening_transcripts").insert([t]).select().single();
      if (error) throw error;
      return data as ScreeningTranscript;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["screening_transcripts", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["screening_transcripts", "all"] });
      toast.success("Transcript intelligence saved to candidate file");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

export function useDeleteTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; candidate_id: string }) => {
      const { error } = await db.from("screening_transcripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["screening_transcripts", vars.candidate_id] });
      qc.invalidateQueries({ queryKey: ["screening_transcripts", "all"] });
      toast.success("Transcript removed");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}

/* ============================ Scorecards ============================ */
export function useScorecards() {
  return useQuery({
    queryKey: ["candidate_scorecards"],
    queryFn: async () => {
      const { data, error } = await db
        .from("candidate_scorecards")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CandidateScorecard[];
    },
  });
}

export function useUpsertScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<CandidateScorecard> & { candidate_id: string }) => {
      const { data: existing } = await db
        .from("candidate_scorecards")
        .select("id")
        .eq("candidate_id", s.candidate_id)
        .limit(1);
      if (existing?.[0]?.id) {
        const { error } = await db.from("candidate_scorecards").update(s).eq("id", existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await db.from("candidate_scorecards").insert([s]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate_scorecards"] });
      toast.success("Scorecard saved");
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });
}
