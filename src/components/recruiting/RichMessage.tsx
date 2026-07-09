import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

/**
 * Claude-style answer surface for the Talent Assistant.
 * — Refined reading typography (serif display headings + calm sans body)
 * — GitHub-flavored markdown (tables, task lists, strikethrough)
 * — Inline data-visualisation via ```chart fenced blocks
 * — Smooth, word-by-word reveal that mimics a live token stream
 */

const CHART_PALETTE = [
  "hsl(var(--emerald))",
  "hsl(var(--cyan))",
  "hsl(var(--holo))",
  "hsl(var(--gold))",
  "hsl(var(--lime))",
  "hsl(var(--orange))",
];

function ChartBlock({ raw }: { raw: string }) {
  let spec: any;
  try {
    spec = JSON.parse(raw);
  } catch {
    return (
      <pre className="rounded-xl border border-border/70 bg-background/60 p-3 text-[11px] overflow-x-auto">
        {raw}
      </pre>
    );
  }

  const data: any[] = Array.isArray(spec?.data) ? spec.data : [];
  const type: string = spec?.type || "bar";
  const keyField: string = spec?.x || spec?.nameKey || "name";
  const series: string[] =
    Array.isArray(spec?.series) && spec.series.length
      ? spec.series
      : Object.keys(data[0] || {}).filter((k) => k !== keyField && typeof data[0]?.[k] === "number");
  if (!data.length || !series.length) return null;

  const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
  const grid = "hsl(var(--border))";
  const tooltip = {
    contentStyle: {
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      fontSize: 12,
      boxShadow: "0 10px 30px -12px rgba(0,0,0,0.5)",
    },
    labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
    itemStyle: { color: "hsl(var(--foreground))" },
  };

  return (
    <figure className="not-prose my-4 rounded-2xl border border-border/70 bg-background/40 p-3.5 animate-rise">
      {spec?.title && (
        <figcaption className="micro-label text-[9px] text-muted-foreground mb-3 pl-0.5">
          {spec.title}
        </figcaption>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey={series[0]}
                nameKey={keyField}
                innerRadius={44}
                outerRadius={78}
                paddingAngle={3}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : type === "line" || type === "area" ? (
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s} id={`g-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={keyField} tick={axis} tickLine={false} axisLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tooltip} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s, i) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                  strokeWidth={2.4}
                  fill={`url(#g-${i})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={keyField} tick={axis} tickLine={false} axisLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tooltip} cursor={{ fill: "hsl(var(--emerald) / 0.06)" }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} radius={[6, 6, 0, 0]} fill={CHART_PALETTE[i % CHART_PALETTE.length]} maxBarSize={46} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Progressive, smooth reveal that reads like a live token stream. */
function useReveal(content: string, animate: boolean) {
  const [shown, setShown] = useState(animate ? "" : content);
  const raf = useRef<number>();
  const started = useRef(false);

  useEffect(() => {
    if (!animate) {
      setShown(content);
      return;
    }
    if (started.current) return;
    started.current = true;

    const total = content.length;
    // Reveal quickly for long answers, gently for short ones (~2.2k chars/sec cap).
    const duration = Math.min(2600, Math.max(500, total * 5));
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutCubic for a calm settle
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.floor(eased * total);
      setShown(content.slice(0, n));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setShown(content);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [content, animate]);

  return shown;
}

export default function RichMessage({
  content,
  animate = false,
}: {
  content: string;
  animate?: boolean;
}) {
  const shown = useReveal(content, animate);
  const streaming = animate && shown.length < content.length;

  const components = useMemo(
    () => ({
      code({ inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1];
        const text = String(children).replace(/\n$/, "");
        if (!inline && (lang === "chart" || lang === "charts")) {
          return <ChartBlock raw={text} />;
        }
        if (inline) {
          return (
            <code className="rounded-md bg-emerald/10 border border-emerald/15 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald" {...props}>
              {children}
            </code>
          );
        }
        return (
          <div className="not-prose my-3 overflow-hidden rounded-xl border border-border/70 bg-[hsl(var(--ink))]/60">
            {lang && (
              <div className="micro-label text-[8px] text-muted-foreground/70 border-b border-border/60 px-3 py-1.5">
                {lang}
              </div>
            )}
            <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed">
              <code className="font-mono text-foreground/90">{children}</code>
            </pre>
          </div>
        );
      },
      table({ children }: any) {
        return (
          <div className="not-prose my-3 overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full border-collapse text-[12.5px]">{children}</table>
          </div>
        );
      },
      thead({ children }: any) {
        return <thead className="bg-emerald/[0.06]">{children}</thead>;
      },
      th({ children }: any) {
        return <th className="border-b border-border/70 px-3 py-2 text-left font-semibold text-foreground">{children}</th>;
      },
      td({ children }: any) {
        return <td className="border-b border-border/40 px-3 py-2 align-top text-muted-foreground">{children}</td>;
      },
      a({ children, href }: any) {
        return (
          <a href={href} target="_blank" rel="noreferrer" className="text-emerald underline decoration-emerald/30 underline-offset-2 hover:decoration-emerald">
            {children}
          </a>
        );
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="my-3 border-l-2 border-emerald/50 bg-emerald/[0.04] rounded-r-lg pl-3.5 pr-3 py-1.5 text-muted-foreground italic">
            {children}
          </blockquote>
        );
      },
    }),
    []
  );

  return (
    <div className="prose-claude">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {shown}
      </ReactMarkdown>
      {streaming && <span className="claude-caret" aria-hidden />}
    </div>
  );
}
