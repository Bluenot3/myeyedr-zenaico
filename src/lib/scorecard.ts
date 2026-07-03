import type { Competency, EvaluationRating } from "@/hooks/useRecruiting";

export interface RecOption {
  key: string;
  label: string;
  hsl: string;
}

export const RECOMMENDATIONS: RecOption[] = [
  { key: "strong_yes", label: "Strong Yes", hsl: "160 84% 42%" },
  { key: "yes", label: "Yes", hsl: "150 70% 45%" },
  { key: "neutral", label: "Mixed", hsl: "40 90% 55%" },
  { key: "no", label: "No", hsl: "24 90% 55%" },
  { key: "strong_no", label: "Strong No", hsl: "0 80% 58%" },
];

export const recMeta = (key: string): RecOption =>
  RECOMMENDATIONS.find((r) => r.key === key) || { key: "", label: "Not decided", hsl: "215 16% 55%" };

/** Weighted 0–100 overall from 1–5 competency ratings; only rated items count. */
export function computeEvaluationScore(ratings: EvaluationRating[]): number {
  // Weight is carried on ratings via label order; fallback to equal weight.
  const rated = ratings.filter((r) => r.score > 0);
  if (rated.length === 0) return 0;
  const total = rated.reduce((s, r) => s + r.score, 0);
  return Math.round((total / (rated.length * 5)) * 100);
}

/** Weighted variant using competency weights matched by id. */
export function computeWeightedScore(ratings: EvaluationRating[], competencies: Competency[]): number {
  const rated = ratings.filter((r) => r.score > 0);
  if (rated.length === 0) return 0;
  let weightSum = 0;
  let acc = 0;
  for (const r of rated) {
    const w = competencies.find((c) => c.id === r.id)?.weight || 1;
    weightSum += w;
    acc += (r.score / 5) * w;
  }
  return weightSum ? Math.round((acc / weightSum) * 100) : 0;
}

export const blankCompetency = (): Competency => ({
  id: Math.random().toString(36).slice(2, 9),
  label: "",
  weight: 10,
  guidance: "",
});

export function ratingsFromTemplate(competencies: Competency[]): EvaluationRating[] {
  return competencies.map((c) => ({ id: c.id, label: c.label, score: 0, comment: "" }));
}
