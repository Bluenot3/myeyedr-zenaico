import zenLogo from "@/assets/zen-logo.png.asset.json";

/**
 * "Powered by ZEN AI Co" — neon bar-sign signature.
 * A light beam sweeps across, lighting each letter as it passes until the
 * whole sign is built, then loops endlessly. The ZEN mark carries a crisp
 * shimmer sweep. Purely presentational.
 */
export default function ZenSignature({ className = "" }: { className?: string }) {
  const text = "Powered by ZEN AI Co";
  return (
    <div className={`flex items-center justify-center gap-2.5 select-none ${className}`}>
      {/* ZEN mark with shimmer */}
      <span className="zen-mark relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] ring-1 ring-white/15">
        <img src={zenLogo.url} alt="ZEN AI Co" className="h-full w-full object-cover" />
        <span className="zen-mark-shine" aria-hidden />
      </span>

      {/* Neon sign text */}
      <span className="zen-neon" aria-label={text}>
        <span className="zen-neon-base" aria-hidden>{text}</span>
        <span className="zen-neon-lit" aria-hidden>{text}</span>
        <span className="zen-neon-beam" aria-hidden />
      </span>
    </div>
  );
}
