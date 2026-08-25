/**
 * Talent Assistant output preferences — persisted per browser so the assistant
 * always answers the way this operator likes it.
 */

export type AssistantLength = "brief" | "standard" | "deep";
export type AssistantStyle = "analyst" | "executive" | "coach" | "direct";
export type StreamStyle = "smooth" | "typewriter" | "instant";

export interface AssistantPrefs {
  length: AssistantLength;
  style: AssistantStyle;
  charts: boolean;
  tables: boolean;
  proactive: boolean;
  autoActions: boolean;
  temperature: number;
  streaming: boolean;
  streamStyle: StreamStyle;
}

export const DEFAULT_PREFS: AssistantPrefs = {
  length: "standard",
  style: "analyst",
  charts: true,
  tables: true,
  proactive: true,
  autoActions: true,
  temperature: 0.4,
  streaming: true,
  streamStyle: "smooth",
};

const KEY = "myeyedr.assistant.prefs.v1";

export function loadPrefs(): AssistantPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AssistantPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: AssistantPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — prefs stay in memory for this session */
  }
}

export const LENGTH_LABEL: Record<AssistantLength, string> = {
  brief: "Brief",
  standard: "Standard",
  deep: "Deep dive",
};

export const STYLE_LABEL: Record<AssistantStyle, string> = {
  analyst: "Analyst",
  executive: "Executive",
  coach: "Coach",
  direct: "Direct",
};

export const STREAM_LABEL: Record<StreamStyle, string> = {
  smooth: "Smooth",
  typewriter: "Typewriter",
  instant: "Instant",
};

/* ---------------- Scheduled task cadences ---------------- */
export type Cadence = "hourly" | "daily" | "weekdays" | "weekly" | "once";

export const CADENCE_LABEL: Record<Cadence, string> = {
  hourly: "Every hour",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
  once: "One time",
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Next due timestamp for a cadence, measured from now. */
export function nextRunFor(cadence: Cadence): string | null {
  const now = Date.now();
  if (cadence === "once") return null;
  if (cadence === "hourly") return new Date(now + HOUR).toISOString();
  if (cadence === "weekly") return new Date(now + 7 * DAY).toISOString();
  if (cadence === "weekdays") {
    const d = new Date(now + DAY);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  return new Date(now + DAY).toISOString();
}
