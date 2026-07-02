import { BadgeTone, TONE_HSL } from "@/lib/recruiting";

interface Props {
  label: string;
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
}

/** Small certificate-style verification chip. */
export default function CredentialChip({ label, tone = "gold", pulse = true, className = "" }: Props) {
  const hsl = TONE_HSL[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 micro-label ${className}`}
      style={{ color: `hsl(${hsl})`, border: `1px solid hsl(${hsl} / 0.35)`, background: "rgba(6,18,20,0.55)" }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: `hsl(${hsl})` }} />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${hsl})` }} />
      </span>
      {label}
    </span>
  );
}
