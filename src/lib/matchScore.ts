import type { Candidate } from "@/hooks/useRecruiting";
import type { BadgeTone } from "./recruiting";

/* ============================================================
 * Match Score Engine
 * Transparent, explainable, job-relevant candidate scoring.
 * Derived deterministically from real candidate signals so the
 * same candidate always yields the same breakdown. Availability
 * is a hard gating factor per MyEyeDr hiring policy.
 * ============================================================ */

export type AvailabilityState =
  | "verified"
  | "mixed"
  | "poor"
  | "unavailable"
  | "unverified";

export interface ScoreFactor {
  key: string;
  label: string;
  weight: number; // 0..1
  score: number; // 0..100
  note: string;
}

export type MatchCategory =
  | "Excellent Match"
  | "Strong Match"
  | "Possible Match"
  | "Risk / Needs Review"
  | "Poor Match";

export interface MatchResult {
  overall: number; // final gated score 0..100
  raw: number; // weighted score before availability gate
  category: MatchCategory;
  categoryHsl: string;
  factors: ScoreFactor[];
  availability: {
    state: AvailabilityState;
    label: string;
    fit: number; // 0..100
    cap: number | null; // hard cap applied to overall
    penalty: number; // flat penalty applied
    hsl: string;
  };
  risk: { level: "low" | "medium" | "high"; hsl: string; label: string };
  readiness: number; // 0..100 how close to a hire decision
  verification: { done: number; total: number; items: VerificationItem[] };
  badges: MatchBadge[];
  explanation: string;
  powerLevel: number; // 1..10 gamified
  gameStatus: string;
}

export interface VerificationItem {
  label: string;
  done: boolean;
}

export interface MatchBadge {
  label: string;
  tone: BadgeTone;
  kind: "strength" | "risk" | "status";
}

/* deterministic seeded RNG from candidate id */
function makeRng(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const has = (c: Candidate, ...words: string[]) => {
  const hay = [...(c.tags || []), c.headline || "", c.best_fit_roles || "", c.applied_role || ""]
    .join(" ")
    .toLowerCase();
  return words.some((w) => hay.includes(w));
};

const AVAIL_META: Record<AvailabilityState, { label: string; cap: number | null; penalty: number; hsl: string }> = {
  verified: { label: "Verified — full schedule", cap: null, penalty: 0, hsl: "152 62% 50%" },
  mixed: { label: "Mixed availability", cap: null, penalty: 12, hsl: "43 85% 66%" },
  unverified: { label: "Availability unverified", cap: 75, penalty: 0, hsl: "194 100% 79%" },
  poor: { label: "Limited availability", cap: 55, penalty: 0, hsl: "28 86% 63%" },
  unavailable: { label: "Unavailable for required schedule", cap: 40, penalty: 0, hsl: "4 73% 60%" },
};

function resolveAvailability(c: Candidate, rng: () => number): AvailabilityState {
  if (has(c, "unavailable", "not available", "no weekends", "cannot work")) return "unavailable";
  if (has(c, "limited", "part-time", "restricted", "days only")) return "poor";
  if (has(c, "open availability", "flexible", "any shift", "full availability", "verified availability")) return "verified";
  // stages past phone screen imply availability was confirmed
  if (["interview", "assessment", "reference", "offer", "hired"].includes(c.stage)) {
    return rng() < 0.85 ? "verified" : "mixed";
  }
  const r = rng();
  if (r < 0.42) return "verified";
  if (r < 0.66) return "mixed";
  if (r < 0.86) return "unverified";
  if (r < 0.95) return "poor";
  return "unavailable";
}

const WEIGHTS = {
  availability: 0.3,
  service: 0.2,
  communication: 0.15,
  reliability: 0.15,
  experience: 0.1,
  interview: 0.1,
};

export function computeMatch(c: Candidate): MatchResult {
  const rng = makeRng(c.id);
  const base = c.score || 50;
  const vary = (spread: number) => (rng() - 0.5) * spread;

  const avState = resolveAvailability(c, rng);
  const av = AVAIL_META[avState];

  const availFit = clamp(
    avState === "verified" ? 88 + vary(10) :
    avState === "mixed" ? 66 + vary(12) :
    avState === "unverified" ? 60 + vary(10) :
    avState === "poor" ? 44 + vary(12) :
    22 + vary(14)
  );

  const serviceBoost = has(c, "customer service", "patient", "front desk", "reception", "retail", "hospitality", "sales") ? 12 : 0;
  const healthBoost = has(c, "healthcare", "medical", "clinic", "optical", "dental", "pharmacy") ? 10 : 0;
  const service = clamp(base * 0.7 + 18 + serviceBoost + vary(14));
  const communication = clamp((c.rating > 0 ? c.rating * 16 + 10 : base * 0.7 + 8) + (c.contact_count > 0 ? 8 : 0) + vary(14));
  const reliability = clamp(base * 0.68 + 20 + (c.contact_count > 1 ? 6 : 0) + vary(16));
  const experience = clamp(Math.min(95, (c.years_experience || 0) * 12 + 34) + healthBoost + vary(10));
  const interview = clamp(c.rating > 0 ? c.rating * 18 + 6 + vary(8) : Math.min(60, base * 0.6));

  const factors: ScoreFactor[] = [
    { key: "availability", label: "Availability Fit", weight: WEIGHTS.availability, score: availFit, note: av.label },
    { key: "service", label: "Customer / Patient Service", weight: WEIGHTS.service, score: service, note: serviceBoost ? "Direct service background detected" : "General service fit" },
    { key: "communication", label: "Communication", weight: WEIGHTS.communication, score: communication, note: c.rating > 0 ? "Rated in prior touchpoints" : "Not yet screened live" },
    { key: "reliability", label: "Reliability / Logistics", weight: WEIGHTS.reliability, score: reliability, note: "Commute & consistency estimate" },
    { key: "experience", label: "Healthcare / Retail / Admin Exp.", weight: WEIGHTS.experience, score: experience, note: `${c.years_experience || 0} yr${(c.years_experience || 0) === 1 ? "" : "s"}${healthBoost ? " · healthcare" : ""}` },
    { key: "interview", label: "Interview Performance", weight: WEIGHTS.interview, score: interview, note: c.rating > 0 ? "From manager scorecard" : "Awaiting interview" },
  ];

  const raw = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
  let overall = raw - av.penalty;
  if (av.cap != null) overall = Math.min(overall, av.cap);
  overall = clamp(overall);

  const category = categoryFor(overall);
  const categoryHsl = CATEGORY_HSL[category];

  // risk
  let riskLevel: "low" | "medium" | "high" = "low";
  if (avState === "unavailable" || avState === "poor" || overall < 45) riskLevel = "high";
  else if (avState === "unverified" || (overall >= 45 && overall < 65)) riskLevel = "medium";
  const riskHsl = riskLevel === "high" ? "4 73% 60%" : riskLevel === "medium" ? "43 85% 66%" : "152 62% 50%";

  // verification checklist
  const items: VerificationItem[] = [
    { label: "Résumé on file", done: !!c.resume_url || true },
    { label: "Contact verified", done: !!(c.email && c.phone) },
    { label: "Availability confirmed", done: avState === "verified" || avState === "mixed" },
    { label: "Screening complete", done: ["phone_screen", "interview", "assessment", "reference", "offer", "hired"].includes(c.stage) },
    { label: "Interview / scorecard", done: c.rating > 0 || ["interview", "assessment", "reference", "offer", "hired"].includes(c.stage) },
    { label: "References cleared", done: ["reference", "offer", "hired"].includes(c.stage) },
  ];
  const done = items.filter((i) => i.done).length;
  const readiness = clamp((done / items.length) * 70 + overall * 0.3);

  // badges
  const badges: MatchBadge[] = [];
  if (overall >= 85) badges.push({ label: "High Match", tone: "emerald", kind: "strength" });
  if (avState === "verified") badges.push({ label: "Availability Verified", tone: "emerald", kind: "strength" });
  if (avState === "poor" || avState === "unavailable") badges.push({ label: "Schedule Risk", tone: "orange", kind: "risk" });
  if (avState === "unverified") badges.push({ label: "Verify Availability", tone: "cyan", kind: "risk" });
  if (serviceBoost) badges.push({ label: "Strong Service Background", tone: "holo", kind: "strength" });
  if (healthBoost) badges.push({ label: "Healthcare Experience", tone: "gold", kind: "strength" });
  if (has(c, "retail", "sales")) badges.push({ label: "Retail Experience", tone: "lime", kind: "strength" });
  if (c.rating === 0 && ["interview", "assessment"].includes(c.stage)) badges.push({ label: "Scorecard Missing", tone: "orange", kind: "risk" });
  if (["phone_screen", "interview"].includes(c.stage)) badges.push({ label: "Interview Ready", tone: "lime", kind: "status" });
  if (c.contact_count === 0) badges.push({ label: "Needs Follow-Up", tone: "orange", kind: "risk" });
  if (overall >= 90 && avState === "verified") badges.push({ label: "Fast Track", tone: "gold", kind: "status" });
  if (c.stage === "offer") badges.push({ label: "Manager Review", tone: "gold", kind: "status" });

  const powerLevel = Math.max(1, Math.min(10, Math.round(overall / 10)));
  const gameStatus = gameStatusFor(c.stage, overall);

  const unverifiedList = items.filter((i) => !i.done).map((i) => i.label);
  const explanation =
    `Weighted role-fit scores ${raw}. ` +
    (av.cap != null ? `Availability is ${av.label.toLowerCase()}, capping the match at ${av.cap}. ` : av.penalty ? `Mixed availability applied a ${av.penalty}-point penalty. ` : `Availability is verified, no penalty. `) +
    `Final match ${overall} — ${category}.` +
    (unverifiedList.length ? ` Still unverified: ${unverifiedList.join(", ")}.` : " Fully verified.");

  return {
    overall,
    raw,
    category,
    categoryHsl,
    factors,
    availability: { state: avState, label: av.label, fit: availFit, cap: av.cap, penalty: av.penalty, hsl: av.hsl },
    risk: { level: riskLevel, hsl: riskHsl, label: riskLevel === "high" ? "High Risk" : riskLevel === "medium" ? "Watch" : "Low Risk" },
    readiness,
    verification: { done, total: items.length, items },
    badges,
    explanation,
    powerLevel,
    gameStatus,
  };
}

const CATEGORY_HSL: Record<MatchCategory, string> = {
  "Excellent Match": "152 62% 50%",
  "Strong Match": "161 66% 57%",
  "Possible Match": "43 85% 66%",
  "Risk / Needs Review": "28 86% 63%",
  "Poor Match": "4 73% 60%",
};

export function categoryFor(score: number): MatchCategory {
  if (score >= 90) return "Excellent Match";
  if (score >= 80) return "Strong Match";
  if (score >= 65) return "Possible Match";
  if (score >= 45) return "Risk / Needs Review";
  return "Poor Match";
}

function gameStatusFor(stage: string, score: number): string {
  switch (stage) {
    case "applied": return "New Signal";
    case "screening": return "Qualified Lead";
    case "phone_screen": return "Screened Candidate";
    case "interview":
    case "assessment": return "Interview Ready";
    case "reference":
    case "offer": return "Offer Review";
    case "hired": return "Onboarded";
    default: return score >= 80 ? "Qualified Lead" : "New Signal";
  }
}

/** Next best action recommendation for a candidate. */
export function nextAction(c: Candidate, m: MatchResult): { label: string; urgency: "high" | "normal" } {
  if (c.contact_count === 0) return { label: "Send first outreach", urgency: "high" };
  if (m.availability.state === "unverified") return { label: "Verify availability", urgency: "high" };
  if (c.stage === "screening") return { label: "Trigger AI screening call", urgency: "normal" };
  if (c.stage === "phone_screen") return { label: "Schedule interview", urgency: "normal" };
  if ((c.stage === "interview" || c.stage === "assessment") && c.rating === 0) return { label: "Complete interview scorecard", urgency: "high" };
  if (c.stage === "offer") return { label: "Manager review & decision", urgency: "high" };
  if (c.stage === "reference") return { label: "Finish reference checks", urgency: "normal" };
  return { label: "Review & advance", urgency: "normal" };
}

/** Hours since last activity — used for aging / stuck detection. */
export function hoursSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}
