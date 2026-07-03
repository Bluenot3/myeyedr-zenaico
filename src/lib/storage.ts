import { supabase } from "@/integrations/supabase/client";

export const CANDIDATE_BUCKET = "candidate-documents";

export interface UploadedDoc {
  name: string;
  url: string;
  type: string;
  size: number;
  kind: "resume" | "attachment";
}

/** Upload a file to the candidate-documents bucket and return its public URL. */
export async function uploadCandidateFile(file: File): Promise<{ url: string }> {
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `intake/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabase.storage.from(CANDIDATE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(CANDIDATE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
