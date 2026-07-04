import zenMark from "@/assets/zen-logo-mono.png.asset.json";

/**
 * "Powered by ZEN AI Co" — crisp corporate signature.
 * A monochrome ZEN mark (black on transparent, auto-inverts on dark surfaces)
 * paired with high-contrast, outlined type and a restrained sheen sweep.
 * Purely presentational.
 */
export default function ZenSignature({ className = "" }: { className?: string }) {
  return (
    <div className={`zen-sig ${className}`}>
      <img src={zenMark.url} alt="ZEN AI Co" className="zen-sig-mark" draggable={false} />
      <span className="zen-sig-text">
        <span className="zen-sig-prefix">Powered by</span>
        <span className="zen-sig-brand">
          ZEN AI Co
          <span className="zen-sig-sheen" aria-hidden />
        </span>
      </span>
    </div>
  );
}
