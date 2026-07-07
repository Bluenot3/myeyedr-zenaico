import { supabase } from "@/integrations/supabase/client";
import { uploadCandidateFile, fileToBase64, UploadedDoc } from "@/lib/storage";
import mammoth from "mammoth";

/** Normalized candidate fields extracted from a résumé. */
export interface ParsedResume {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  applied_role: string;
  headline: string;
  years_experience: number;
  current_employer: string;
  resume_summary: string;
  best_fit_roles: string; // comma-joined skills (kept for existing UI)
  tags: string[];
  work_history: { employer?: string; title?: string; dates?: string }[];
  education: { school?: string; credential?: string; dates?: string }[];
  certifications: string[];
  resume_text: string;
  parse_confidence: number | null;
}

const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isDocx(file: File) {
  return DOCX_TYPES.includes(file.type) || /\.docx$/i.test(file.name);
}
function isLegacyDoc(file: File) {
  return file.type === "application/msword" || /\.doc$/i.test(file.name);
}

/** Extract plain text from a .docx file in the browser. */
async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return (value || "").trim();
}

/** Map the raw edge-function payload into normalized candidate fields. */
export function normalizeParsed(d: Record<string, any>): Partial<ParsedResume> {
  const yearsRaw = d.years_experience;
  const yearsNum =
    typeof yearsRaw === "number"
      ? yearsRaw
      : parseFloat(String(yearsRaw ?? "").replace(/[^0-9.]/g, ""));
  const years = Number.isFinite(yearsNum) ? Math.round(yearsNum) : 0;

  const skills = Array.isArray(d.skills)
    ? d.skills.map((s: any) => String(s).trim()).filter(Boolean)
    : String(d.skills ?? "")
        .split(/[,\n;]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);

  const certifications = Array.isArray(d.certifications)
    ? d.certifications.map((s: any) => String(s).trim()).filter(Boolean)
    : String(d.certifications ?? "")
        .split(/[,\n;]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);

  const work_history = Array.isArray(d.work_history) ? d.work_history : [];
  const education = Array.isArray(d.education) ? d.education : [];

  const out: Partial<ParsedResume> = {};
  if (d.full_name) out.full_name = String(d.full_name);
  if (d.email) out.email = String(d.email);
  if (d.phone) out.phone = String(d.phone);
  if (d.address || d.location) out.address = String(d.address || d.location);
  if (d.applied_role) out.applied_role = String(d.applied_role);
  if (d.current_employer) out.current_employer = String(d.current_employer);
  if (d.headline || d.summary)
    out.headline = String(d.headline || String(d.summary).slice(0, 90));
  if (d.summary || d.relevant_evidence)
    out.resume_summary = String(d.summary || d.relevant_evidence);
  if (years) out.years_experience = years;
  if (skills.length) {
    out.tags = skills;
    out.best_fit_roles = skills.slice(0, 8).join(", ");
  }
  if (certifications.length) out.certifications = certifications;
  if (work_history.length) out.work_history = work_history;
  if (education.length) out.education = education;
  if (d.raw_text) out.resume_text = String(d.raw_text);
  if (typeof d.confidence === "number") out.parse_confidence = d.confidence;
  return out;
}

export interface ParseFileResult {
  parsed: Partial<ParsedResume>;
  doc: UploadedDoc;
}

/**
 * Upload the original résumé to storage AND parse it.
 * Handles PDF / images (sent to the model) and DOCX (text extracted locally first).
 * Legacy .doc is uploaded/attached but cannot be auto-parsed.
 */
export async function uploadAndParseResume(file: File): Promise<ParseFileResult> {
  // Always preserve the original file, linked to the candidate later.
  const { url } = await uploadCandidateFile(file);
  const doc: UploadedDoc = {
    name: file.name,
    url,
    type: file.type,
    size: file.size,
    kind: "resume",
  };

  let body: Record<string, unknown>;
  if (isDocx(file)) {
    const text = await extractDocxText(file);
    if (!text) throw new Error("Could not read text from this Word document.");
    body = { resumeText: text, fileName: file.name };
  } else if (isLegacyDoc(file)) {
    throw new Error(
      "Legacy .doc files can't be auto-parsed — please re-save as PDF or .docx, or enter details manually.",
    );
  } else {
    const base64 = await fileToBase64(file);
    body = { fileBase64: base64, fileName: file.name, mimeType: file.type };
  }

  const { data, error } = await supabase.functions.invoke("parse-resume", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const parsed = normalizeParsed(data?.data || {});
  return { parsed, doc };
}

/* ------------------------- Duplicate detection ------------------------- */

export interface DuplicateCandidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

function normPhone(p: string) {
  return (p || "").replace(/\D/g, "").slice(-10);
}
function normName(n: string) {
  return (n || "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

/** Simple Levenshtein-based similarity 0..1 for names. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Find a likely existing master record for a parsed candidate.
 * Matches on exact email, matching normalized phone, or a very close name.
 */
export function findDuplicate(
  parsed: Partial<ParsedResume>,
  existing: DuplicateCandidate[],
): DuplicateCandidate | null {
  const email = (parsed.email || "").toLowerCase().trim();
  const phone = normPhone(parsed.phone || "");
  const name = normName(parsed.full_name || "");

  if (email) {
    const byEmail = existing.find((c) => (c.email || "").toLowerCase().trim() === email);
    if (byEmail) return byEmail;
  }
  if (phone && phone.length === 10) {
    const byPhone = existing.find((c) => normPhone(c.phone) === phone);
    if (byPhone) return byPhone;
  }
  if (name) {
    const byName = existing.find((c) => similarity(normName(c.full_name), name) >= 0.9);
    if (byName) return byName;
  }
  return null;
}
