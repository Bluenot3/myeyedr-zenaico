import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicJobLocation {
  id: string;
  site_name: string;
  city: string;
  state: string;
  region: string;
}

export interface PublicJob {
  id: string;
  title: string;
  department: string;
  employment_type: string;
  pay_range: string;
  description: string;
  requirements: string;
  region: string;
  req_code: string;
  openings: number;
  priority: string;
  posted_at: string;
  location: PublicJobLocation | null;
}

export interface PublicStats {
  open_roles: number;
  seats: number;
  regions: number;
  offices: number;
  network_offices: number;
  by_role: { title: string; count: number }[];
  by_region: { region: string; count: number }[];
  by_type: { type: string; count: number }[];
}

export interface PublicJobsPayload {
  jobs: PublicJob[];
  stats: PublicStats;
  generated_at: string;
}

export function usePublicJobs() {
  return useQuery<PublicJobsPayload>({
    queryKey: ["public-jobs"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("public-jobs", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Could not load openings");
      return { jobs: data.jobs || [], stats: data.stats, generated_at: data.generated_at };
    },
  });
}

export interface ApplyPayload {
  full_name: string;
  email: string;
  phone?: string;
  position_id?: string | null;
  desired_role?: string;
  talent_pool?: boolean;
  message?: string;
  availability?: string;
  certifications?: string;
  years_experience?: number;
  file_base64?: string;
  file_name?: string;
  mime_type?: string;
}

export async function submitApplication(payload: ApplyPayload): Promise<{ message: string; already_applied: boolean }> {
  const { data, error } = await supabase.functions.invoke("public-apply", { body: payload });
  if (error) {
    // Edge errors carry the JSON body in the response context
    const detail = (data as { error?: string } | null)?.error;
    throw new Error(detail || error.message || "We couldn't submit your application.");
  }
  if (!data?.success) throw new Error(data?.error || "We couldn't submit your application.");
  return { message: data.message as string, already_applied: !!data.already_applied };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Human "posted 3 days ago" helper for the public site. */
export function postedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  const mo = Math.round(days / 30);
  return `Posted ${mo} month${mo === 1 ? "" : "s"} ago`;
}

export function jobCity(job: PublicJob): string {
  if (job.location) {
    const city = [job.location.city, job.location.state].filter(Boolean).join(", ");
    return city || job.location.site_name || job.region || "Multiple offices";
  }
  return job.region || "Multiple offices";
}

/* ------------------------------------------------------------------ *
 * Returning-applicant profile (one-tap apply)
 * Stored locally on the applicant's own device only — never uploaded
 * anywhere except as part of an application they explicitly submit.
 * ------------------------------------------------------------------ */

export interface SavedApplicant {
  full_name: string;
  email: string;
  phone?: string;
  resume_name?: string;
  saved_at: string;
}

const APPLICANT_KEY = "myeyedr.careers.applicant";

export function loadSavedApplicant(): SavedApplicant | null {
  try {
    const raw = localStorage.getItem(APPLICANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedApplicant;
    if (!parsed?.email || !parsed?.full_name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveApplicant(profile: Omit<SavedApplicant, "saved_at">) {
  try {
    localStorage.setItem(
      APPLICANT_KEY,
      JSON.stringify({ ...profile, saved_at: new Date().toISOString() } satisfies SavedApplicant),
    );
  } catch {
    /* storage unavailable (private mode) — one-tap apply just stays off */
  }
}

export function clearSavedApplicant() {
  try {
    localStorage.removeItem(APPLICANT_KEY);
  } catch {
    /* ignore */
  }
}
