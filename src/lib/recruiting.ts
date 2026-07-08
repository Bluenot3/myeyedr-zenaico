import {
  FileText, Gauge, ClipboardCheck, MessagesSquare, Phone, ShieldCheck,
  Target, Award, StickyNote, UserCheck, type LucideIcon,
} from "lucide-react";

/* ---------------- Pipeline stages ---------------- */
export interface StageMeta {
  key: string;
  label: string;
  hsl: string; // "H S% L%"
  short: string;
  /** the exact BGCGW onboarding action for this phase */
  action?: string;
  /** clear "done" criteria — how a manager knows the candidate can advance */
  done?: string;
}

export const STAGES: StageMeta[] = [
  { key: "applied", label: "Applied", hsl: "196 100% 80%", short: "APP",
    action: "Resume received & profile created",
    done: "Contact info verified and candidate logged to the correct site/position." },
  { key: "screening", label: "Screening", hsl: "190 100% 74%", short: "SCR",
    action: "Resume review & initial fit check",
    done: "Resume reviewed, match score generated, and first outreach sent." },
  { key: "phone_screen", label: "Phone Screen", hsl: "202 100% 68%", short: "PHN",
    action: "Availability & interest screening call",
    done: "Availability confirmed, interest confirmed, and screening notes logged." },
  { key: "interview", label: "Interview", hsl: "210 100% 64%", short: "INT",
    action: "Site manager interview",
    done: "Interview completed and scorecard submitted by the hiring manager." },
  { key: "assessment", label: "Assessment", hsl: "216 100% 62%", short: "ASM",
    action: "Skills & role-fit assessment",
    done: "Assessment scored and role-fit evidence documented on the profile." },
  { key: "reference", label: "Reference", hsl: "222 100% 64%", short: "REF",
    action: "Reference & background checks",
    done: "References contacted and background/clearance verification cleared." },
  { key: "offer", label: "Offer", hsl: "228 100% 68%", short: "OFR",
    action: "Offer & pre-hire paperwork",
    done: "Offer extended, accepted, and onboarding paperwork initiated." },
  { key: "hired", label: "Hired", hsl: "160 84% 46%", short: "HIR",
    action: "Onboarding complete",
    done: "Start date set, credentials issued, and candidate onboarded to the site." },
];

export const TERMINAL_STAGES: Record<string, StageMeta> = {
  rejected: { key: "rejected", label: "Rejected", hsl: "4 73% 60%", short: "REJ" },
  withdrawn: { key: "withdrawn", label: "Withdrawn", hsl: "180 10% 55%", short: "WDN" },
};

export function stageMeta(key: string): StageMeta {
  return (
    STAGES.find((s) => s.key === key) ||
    TERMINAL_STAGES[key] || {
      key,
      label: key,
      hsl: "180 10% 60%",
      short: key.slice(0, 3).toUpperCase(),
    }
  );
}

export function stageIndex(key: string): number {
  const i = STAGES.findIndex((s) => s.key === key);
  return i === -1 ? 0 : i;
}

export function stageProgress(key: string): number {
  if (key === "hired") return 100;
  if (key === "rejected" || key === "withdrawn") return 0;
  const i = stageIndex(key);
  return Math.round(((i + 1) / STAGES.length) * 100);
}

/* ---------------- Badge (ledger) types ---------------- */
export type BadgeTone = "emerald" | "gold" | "holo" | "cyan" | "orange" | "lime";

export interface BadgeMeta {
  label: string;
  icon: LucideIcon;
  tone: BadgeTone;
}

export const BADGE_TYPES: Record<string, BadgeMeta> = {
  resume: { label: "Résumé", icon: FileText, tone: "holo" },
  screening_score: { label: "Screening Score", icon: Gauge, tone: "emerald" },
  evaluation: { label: "Evaluation", icon: ClipboardCheck, tone: "gold" },
  phone_screen: { label: "Phone Screen", icon: Phone, tone: "cyan" },
  interview: { label: "Interview", icon: MessagesSquare, tone: "lime" },
  assessment: { label: "Skills Assessment", icon: Target, tone: "gold" },
  reference: { label: "Reference Check", icon: ShieldCheck, tone: "orange" },
  background: { label: "Background", icon: ShieldCheck, tone: "holo" },
  offer: { label: "Offer", icon: Award, tone: "gold" },
  hired: { label: "Hired", icon: UserCheck, tone: "emerald" },
  note: { label: "Note", icon: StickyNote, tone: "holo" },
};

export function badgeMeta(type: string): BadgeMeta {
  return BADGE_TYPES[type] || { label: type, icon: StickyNote, tone: "holo" };
}

export const TONE_HSL: Record<BadgeTone, string> = {
  emerald: "214 100% 62%",
  gold: "197 100% 78%",
  holo: "190 100% 80%",
  cyan: "200 100% 74%",
  orange: "216 100% 66%",
  lime: "186 100% 72%",
};

/* ---------------- Misc ---------------- */
export const REGIONS = ["Delaware County", "Chester County", "Bucks County", "Montgomery County", "Lehigh Valley"];

export const SOURCES = ["Indeed", "LinkedIn", "Referral", "Company Website", "Walk-in", "Career Fair", "Talent Pool"];

export const POSITION_STATUS = ["open", "on_hold", "filled", "closed"];
export const PRIORITIES = ["low", "normal", "high", "urgent"];

export const SCREENING_STATUS = ["not_started", "scheduled", "in_progress", "passed", "failed"];
export const INTERVIEW_STATUS = ["not_started", "scheduled", "completed", "passed", "failed"];

export function prettyStatus(s: string): string {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function makeHash(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortHash(h: string): string {
  if (!h) return "—";
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}

export function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function scoreTone(score: number): BadgeTone {
  if (score >= 85) return "emerald";
  if (score >= 70) return "lime";
  if (score >= 50) return "gold";
  return "orange";
}
