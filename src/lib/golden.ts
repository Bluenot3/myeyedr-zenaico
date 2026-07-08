import type { Candidate, Position } from "@/hooks/useRecruiting";
import { computeMatch } from "./matchScore";

/* ============================================================
 * Golden Fit Engine
 * Benchmarks real candidates against a "golden example" — the
 * ideal-candidate profile defined per role/position. Every score
 * is derived deterministically from real candidate signals so a
 * candidate always benchmarks the same way against a given golden.
 * ============================================================ */

export const GOLDEN_DIM_KEYS = [
  "availability",
  "service",
  "communication",
  "reliability",
  "experience",
  "interview",
  "skills",
] as const;

export type GoldenDimKey = (typeof GOLDEN_DIM_KEYS)[number];

export const GOLDEN_DIM_LABELS: Record<GoldenDimKey, string> = {
  availability: "Availability",
  service: "Customer Service",
  communication: "Communication",
  reliability: "Reliability",
  experience: "Experience",
  interview: "Interview Fit",
  skills: "Skill Match",
};

export interface GoldenDimension {
  key: GoldenDimKey;
  label: string;
  target: number; // 0..100 ideal level
  weight: number; // 1..10 relative importance
}

export interface GoldenProfile {
  id: string;
  position_id: string | null;
  role: string;
  name: string;
  source: string; // existing | upload | generated | manual
  candidate_id: string | null;
  summary: string;
  ideal_years_experience: number;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  red_flags: string[];
  interview_focus: string[];
  dimensions: GoldenDimension[];
  resume_text: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_DIMENSIONS: GoldenDimension[] = GOLDEN_DIM_KEYS.map((k) => ({
  key: k,
  label: GOLDEN_DIM_LABELS[k],
  target: k === "skills" || k === "service" ? 90 : 85,
  weight: k === "availability" ? 9 : k === "service" ? 8 : k === "skills" ? 8 : 6,
}));

export function blankGolden(role = ""): Partial<GoldenProfile> {
  return {
    role,
    name: role ? `The Ideal ${role}` : "Ideal Candidate",
    source: "manual",
    summary: "",
    ideal_years_experience: 3,
    must_have_skills: [],
    nice_to_have_skills: [],
    red_flags: [],
    interview_focus: [],
    dimensions: DEFAULT_DIMENSIONS,
    resume_text: "",
    is_active: true,
  };
}

const skillHaystack = (c: Candidate) =>
  [...(c.tags || []), c.headline || "", c.best_fit_roles || "", c.applied_role || "", c.source || ""]
    .join(" ")
    .toLowerCase();

/** How many of a skill list the candidate demonstrably matches (0..1). */
function skillCoverage(c: Candidate, skills: string[]): { matched: string[]; missing: string[]; ratio: number } {
  const hay = skillHaystack(c);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of skills) {
    const token = s.toLowerCase().split(/[/,()]/)[0].trim();
    const words = token.split(/\s+/).filter((w) => w.length > 3);
    const hit = words.length > 0 ? words.some((w) => hay.includes(w)) : hay.includes(token);
    (hit ? matched : missing).push(s);
  }
  return { matched, missing, ratio: skills.length ? matched.length / skills.length : 0 };
}

/** Candidate's value (0..100) on each golden dimension. */
export function candidateVector(c: Candidate, golden: GoldenProfile): Record<GoldenDimKey, number> {
  const m = computeMatch(c);
  const factor = (k: string) => m.factors.find((f) => f.key === k)?.score ?? 0;

  const must = skillCoverage(c, golden.must_have_skills || []);
  const nice = skillCoverage(c, golden.nice_to_have_skills || []);
  const skills = Math.round(
    (golden.must_have_skills?.length || golden.nice_to_have_skills?.length)
      ? (must.ratio * 0.7 + nice.ratio * 0.3) * 100
      : Math.min(100, (c.tags?.length || 0) * 18)
  );

  return {
    availability: m.availability.fit,
    service: factor("service"),
    communication: factor("communication"),
    reliability: factor("reliability"),
    experience: factor("experience"),
    interview: factor("interview"),
    skills,
  };
}

export interface GoldenFit {
  candidate: Candidate;
  fit: number; // 0..100 closeness to the golden standard
  vector: Record<GoldenDimKey, number>;
  gaps: { key: GoldenDimKey; label: string; target: number; value: number; gap: number }[];
  strengths: { key: GoldenDimKey; label: string; value: number }[];
  mustMatched: string[];
  mustMissing: string[];
  niceMatched: string[];
  verdict: string;
  hsl: string;
}

export function verdictFor(fit: number): { label: string; hsl: string } {
  if (fit >= 90) return { label: "Golden Match", hsl: "190 100% 66%" };
  if (fit >= 78) return { label: "Excellent Fit", hsl: "214 100% 62%" };
  if (fit >= 62) return { label: "Solid Fit", hsl: "150 70% 45%" };
  if (fit >= 45) return { label: "Partial Fit", hsl: "43 90% 60%" };
  return { label: "Off Target", hsl: "24 90% 58%" };
}

/** Compare one candidate to the golden standard. */
export function computeGoldenFit(c: Candidate, golden: GoldenProfile): GoldenFit {
  const vector = candidateVector(c, golden);
  const dims = golden.dimensions?.length ? golden.dimensions : DEFAULT_DIMENSIONS;

  let weightSum = 0;
  let acc = 0;
  const gaps: GoldenFit["gaps"] = [];
  const strengths: GoldenFit["strengths"] = [];

  for (const d of dims) {
    const value = vector[d.key] ?? 0;
    const w = d.weight || 1;
    weightSum += w;
    // Meeting or exceeding the target scores full marks; shortfalls cost proportionally.
    const closeness = d.target > 0 ? Math.max(0, Math.min(1, value / d.target)) : 1;
    acc += closeness * w;
    const gap = Math.max(0, d.target - value);
    if (gap >= 8) gaps.push({ key: d.key, label: d.label, target: d.target, value, gap });
    if (value >= Math.min(d.target, 78)) strengths.push({ key: d.key, label: d.label, value });
  }

  const fit = Math.round((weightSum ? acc / weightSum : 0) * 100);
  const must = skillCoverage(c, golden.must_have_skills || []);
  const nice = skillCoverage(c, golden.nice_to_have_skills || []);
  const v = verdictFor(fit);

  gaps.sort((a, b) => b.gap - a.gap);
  strengths.sort((a, b) => b.value - a.value);

  return {
    candidate: c,
    fit,
    vector,
    gaps,
    strengths,
    mustMatched: must.matched,
    mustMissing: must.missing,
    niceMatched: nice.matched,
    verdict: v.label,
    hsl: v.hsl,
  };
}

/** Build a golden dimension set + skills from an existing strong candidate. */
export function goldenFromCandidate(c: Candidate): Partial<GoldenProfile> {
  const m = computeMatch(c);
  const factor = (k: string) => m.factors.find((f) => f.key === k)?.score ?? 0;
  const dims: GoldenDimension[] = GOLDEN_DIM_KEYS.map((k) => {
    const raw =
      k === "availability" ? m.availability.fit :
      k === "skills" ? Math.min(100, (c.tags?.length || 0) * 18 + 40) :
      factor(k);
    return {
      key: k,
      label: GOLDEN_DIM_LABELS[k],
      target: Math.max(70, Math.min(96, Math.round(raw))),
      weight: DEFAULT_DIMENSIONS.find((d) => d.key === k)!.weight,
    };
  });
  return {
    role: c.applied_role || "",
    name: `Ideal — modeled on ${c.full_name.split(" ")[0]}`,
    source: "existing",
    candidate_id: c.id,
    summary: c.headline || `Benchmark modeled on ${c.full_name}, a strong ${c.applied_role || "candidate"}.`,
    ideal_years_experience: c.years_experience || 3,
    must_have_skills: (c.tags || []).slice(0, 8),
    nice_to_have_skills: [],
    red_flags: [],
    interview_focus: [],
    dimensions: dims,
    resume_text: "",
    is_active: true,
  };
}
