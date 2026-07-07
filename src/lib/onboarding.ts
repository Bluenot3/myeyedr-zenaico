/* ============================================================
   Onboarding — new-hire checklist + training templates
   ============================================================ */

export type StepStatus = "pending" | "in_progress" | "done" | "na";

export interface OnboardingStep {
  key: string;
  label: string;
  group: string;
  status: StepStatus;
  date?: string; // ISO date the step was completed / scheduled
  notes?: string;
}

export interface TrainingWeek {
  week: number;
  focus: string;
  trainer: string;
  location: string;
  activities: string;
}

export const ONBOARDING_GROUPS = [
  "Offer",
  "Compliance",
  "Paperwork",
  "Systems & Access",
  "Day One",
] as const;

/** The canonical MyEyeDr onboarding timeline. */
export function defaultOnboardingSteps(): OnboardingStep[] {
  const s = (key: string, label: string, group: string): OnboardingStep => ({
    key,
    label,
    group,
    status: "pending",
  });
  return [
    // Offer
    s("offer_extended", "Offer letter extended", "Offer"),
    s("offer_countered", "Counter / negotiation", "Offer"),
    s("offer_accepted", "Offer letter accepted", "Offer"),
    // Compliance
    s("background_check", "Background check completed", "Compliance"),
    s("drug_screen", "Drug screen cleared", "Compliance"),
    s("i9", "I-9 employment verification", "Compliance"),
    s("references", "References verified", "Compliance"),
    s("licensure", "Licensure / certifications verified", "Compliance"),
    // Paperwork
    s("w4", "W-4 & state tax forms", "Paperwork"),
    s("direct_deposit", "Direct deposit set up", "Paperwork"),
    s("handbook", "Employee handbook acknowledged", "Paperwork"),
    s("benefits", "Benefits enrollment", "Paperwork"),
    s("emergency", "Emergency contact on file", "Paperwork"),
    // Systems & Access
    s("email", "Company email & credentials issued", "Systems & Access"),
    s("systems", "POS / EHR system access provisioned", "Systems & Access"),
    s("badge", "Badge / keys issued", "Systems & Access"),
    s("uniform", "Uniform / dress code provided", "Systems & Access"),
    // Day One
    s("first_day_scheduled", "First day scheduled", "Day One"),
    s("workspace", "Workspace ready", "Day One"),
    s("welcome", "Welcome & team introductions", "Day One"),
  ];
}

/** A sensible 4-week ramp for a new optical hire. */
export function defaultTrainingSchedule(trainer = "", location = ""): TrainingWeek[] {
  return [
    {
      week: 1,
      focus: "Orientation & Brand Foundations",
      trainer,
      location,
      activities:
        "Company mission & values, HIPAA/compliance basics, systems login, shadow front desk, patient greeting & scheduling.",
    },
    {
      week: 2,
      focus: "Core Role Skills",
      trainer,
      location,
      activities:
        "Insurance verification, EHR workflows, product knowledge (frames/lenses), assisted patient interactions.",
    },
    {
      week: 3,
      focus: "Independent Practice (Supervised)",
      trainer,
      location,
      activities:
        "Handle patients with oversight, dispensing basics, upsell & add-ons, handling objections, KPI review.",
    },
    {
      week: 4,
      focus: "Ownership & Certification",
      trainer,
      location,
      activities:
        "Full workflow ownership, quality checks, 30-day performance review, certification sign-off & goal setting.",
    },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]): number {
  const active = steps.filter((s) => s.status !== "na");
  if (active.length === 0) return 0;
  const done = active.filter((s) => s.status === "done").length;
  return Math.round((done / active.length) * 100);
}
