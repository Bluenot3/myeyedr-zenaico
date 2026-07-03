import wordmark from "@/assets/myeyedr-wordmark.png.asset.json";

interface MarkProps {
  size?: number;
  className?: string;
  spin?: boolean;
}

/**
 * MyEyeDr eye-mark — minimalist single-weight eye glyph.
 * Used as a compact brand token (favicon-style) where the full wordmark
 * does not fit.
 */
export function EyeMark({ size = 40, className = "", spin = false }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={`${className} ${spin ? "animate-spin-slow" : ""}`}
    >
      <defs>
        <linearGradient id="eye-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f8bff" />
          <stop offset="1" stopColor="#9fe4ff" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" stroke="url(#eye-brand)" strokeWidth="1" opacity="0.28" />
      <path
        d="M8 24C8 24 14.5 14 24 14C33.5 14 40 24 40 24C40 24 33.5 34 24 34C14.5 34 8 24 8 24Z"
        stroke="url(#eye-brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="6.2" stroke="url(#eye-brand)" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="2.4" fill="url(#eye-brand)" />
      <circle cx="26.4" cy="21.6" r="1" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** height of the wordmark in px */
  markSize?: number;
  /** show a sublabel under the wordmark */
  sub?: string;
  /** @deprecated kept for API compatibility */
  wordSize?: number;
}

/**
 * Official MyEyeDr wordmark lockup, tuned for dark surfaces.
 * The `markSize` prop maps to the rendered wordmark height so existing
 * call sites keep working.
 */
export default function Logo({ className = "", markSize = 34, sub }: LogoProps) {
  // wordmark aspect ratio ~ 1658 / 292 = 5.68
  const height = Math.round(markSize * 0.82);
  return (
    <div className={`flex flex-col ${className}`}>
      <img
        src={wordmark.url}
        alt="MyEyeDr"
        style={{ height }}
        className="w-auto select-none drop-shadow-[0_1px_12px_rgba(58,155,255,0.28)]"
        draggable={false}
      />
      {sub && (
        <p className="micro-label text-[8px] text-muted-foreground mt-1.5 pl-0.5">{sub}</p>
      )}
    </div>
  );
}
