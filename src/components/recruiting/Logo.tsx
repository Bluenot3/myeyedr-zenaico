interface MarkProps {
  size?: number;
  className?: string;
  spin?: boolean;
}

/**
 * MyEyeDr eye-mark — minimalist single-weight eye glyph.
 * Modern, brand-aligned, works at any size.
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
          <stop offset="0" stopColor="#45dcae" />
          <stop offset="1" stopColor="#95e8ff" />
        </linearGradient>
      </defs>
      {/* soft outer ring */}
      <circle cx="24" cy="24" r="22" stroke="url(#eye-brand)" strokeWidth="1" opacity="0.28" />
      {/* eye almond */}
      <path
        d="M8 24C8 24 14.5 14 24 14C33.5 14 40 24 40 24C40 24 33.5 34 24 34C14.5 34 8 24 8 24Z"
        stroke="url(#eye-brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* iris */}
      <circle cx="24" cy="24" r="6.2" stroke="url(#eye-brand)" strokeWidth="2.2" />
      {/* pupil */}
      <circle cx="24" cy="24" r="2.4" fill="url(#eye-brand)" />
      {/* catchlight */}
      <circle cx="26.4" cy="21.6" r="1" fill="#fcf9f2" opacity="0.9" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markSize?: number;
  /** show the "Talent Command" sublabel under the wordmark */
  sub?: string;
  /** wordmark font-size in px */
  wordSize?: number;
}

/**
 * Full MyEyeDr lockup — eye-mark + lowercase wordmark in a modern,
 * rounded, minimalist treatment.
 */
export default function Logo({ className = "", markSize = 34, sub, wordSize = 20 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <EyeMark size={markSize} />
      <div className="leading-none">
        <span
          className="font-sans font-extrabold tracking-tight lowercase select-none"
          style={{ fontSize: wordSize }}
        >
          <span className="text-foreground">myeye</span>
          <span className="text-emerald">dr</span>
          <span className="text-gold">.</span>
        </span>
        {sub && (
          <p className="micro-label text-[8px] text-muted-foreground mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}
