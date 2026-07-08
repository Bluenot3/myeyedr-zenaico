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
  "Coverage",
  "Schedule & Space",
  "Access & Tools",
  "Day One",
] as const;

/** Legacy step keys (offer/payroll/compliance) — used to detect old records. */
export const LEGACY_STEP_KEYS = [
  "offer_extended", "offer_countered", "offer_accepted", "background_check",
  "drug_screen", "i9", "w4", "direct_deposit", "benefits",
];

/**
 * The hiring-manager readiness checklist. Offer letters, background checks,
 * I-9, and payroll live in other systems — this list keeps the manager focused
 * on being ready to actually train the new hire.
 */
export function defaultOnboardingSteps(): OnboardingStep[] {
  const s = (key: string, label: string, group: string): OnboardingStep => ({
    key,
    label,
    group,
    status: "pending",
  });
  return [
    // Coverage — so the trainer can focus on training, not the floor
    s("trainer_assigned", "Primary trainer assigned", "Coverage"),
    s("coverage_arranged", "Floor coverage arranged during training", "Coverage"),
    s("backup_trainer", "Backup trainer identified", "Coverage"),
    s("team_informed", "Team informed a new hire is starting", "Coverage"),
    // Schedule & Space
    s("first_day_scheduled", "First day & report time set", "Schedule & Space"),
    s("first_week_schedule", "First-week schedule shared with new hire", "Schedule & Space"),
    s("workspace", "Workspace / station ready", "Schedule & Space"),
    s("intro_message", "Welcome message sent to new hire", "Schedule & Space"),
    // Access & Tools
    s("credentials_requested", "Logins & credentials requested", "Access & Tools"),
    s("systems", "POS / EHR system access confirmed", "Access & Tools"),
    s("badge", "Badge / keys ready", "Access & Tools"),
    s("uniform", "Uniform / dress code provided", "Access & Tools"),
    // Day One
    s("welcome", "Welcome & team introductions", "Day One"),
    s("training_plan_reviewed", "4-week training plan reviewed with new hire", "Day One"),
    s("goals_set", "Week-one goals set", "Day One"),
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
