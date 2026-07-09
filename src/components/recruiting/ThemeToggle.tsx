import { useTheme } from "@/hooks/useTheme";

/**
 * ThemeToggle — a high-fidelity animated sun ⇄ moon control.
 * The sun's rays retract and the disc slides into a crescent moon (and back)
 * with spring-eased, staggered motion. Purely presentational.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      className={`theme-orb group relative inline-flex h-9 w-9 items-center justify-center rounded-xl press-spring tap-target ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] overflow-visible">
        <defs>
          <mask id="moon-mask">
            <rect x="0" y="0" width="24" height="24" fill="white" />
            {/* the biting circle carves the crescent — slides in only in dark mode */}
            <circle
              cx={isDark ? 16 : 26}
              cy={isDark ? 8 : 2}
              r="9"
              fill="black"
              style={{ transition: "cx 0.5s cubic-bezier(0.34,1.56,0.64,1), cy 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
          </mask>
        </defs>

        {/* rays — bloom in light mode, retract to center in dark mode */}
        <g
          className="theme-orb__rays"
          style={{
            transformOrigin: "12px 12px",
            transform: isDark ? "scale(0.35) rotate(-45deg)" : "scale(1) rotate(0deg)",
            opacity: isDark ? 0 : 1,
            transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
          }}
        >
          {rays.map((deg, i) => (
            <line
              key={deg}
              x1="12"
              y1="1.5"
              x2="12"
              y2="4"
              strokeLinecap="round"
              strokeWidth="2"
              className="stroke-current"
              style={{
                transformOrigin: "12px 12px",
                transform: `rotate(${deg}deg)`,
                transition: `opacity 0.3s ease ${i * 0.015}s`,
              }}
            />
          ))}
        </g>

        {/* the disc — sun face in light, masked into a crescent in dark */}
        <circle
          cx="12"
          cy="12"
          r={isDark ? 8 : 5.5}
          className="fill-current"
          mask="url(#moon-mask)"
          style={{ transition: "r 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
        />

        {/* tiny stars that twinkle in only when the moon is out */}
        <g
          style={{
            opacity: isDark ? 1 : 0,
            transform: isDark ? "scale(1)" : "scale(0.4)",
            transformOrigin: "12px 12px",
            transition: "opacity 0.4s ease 0.2s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s",
          }}
        >
          <circle cx="6" cy="7" r="0.9" className="fill-current" />
          <circle cx="8.5" cy="17" r="0.7" className="fill-current" />
          <circle cx="18.5" cy="16" r="0.8" className="fill-current" />
        </g>
      </svg>
    </button>
  );
}
