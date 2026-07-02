import { stageMeta, stageProgress } from "@/lib/recruiting";

interface Props {
  stage: string;
  size?: "sm" | "md";
  showProgress?: boolean;
  className?: string;
}

export default function StageBadge({ stage, size = "md", showProgress, className = "" }: Props) {
  const meta = stageMeta(stage);
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider font-medium ${pad} ${className}`}
      style={{
        color: `hsl(${meta.hsl})`,
        background: `hsl(${meta.hsl} / 0.12)`,
        border: `1px solid hsl(${meta.hsl} / 0.35)`,
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: `hsl(${meta.hsl})` }}
        />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${meta.hsl})` }} />
      </span>
      {meta.label}
      {showProgress && <span className="opacity-60">· {stageProgress(stage)}%</span>}
    </span>
  );
}
