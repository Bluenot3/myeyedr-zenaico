import { useState } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Bot } from "lucide-react";
import { useLoginBrief, useRefreshLoginBrief } from "@/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import RichMessage from "./RichMessage";
import { toast } from "sonner";

const STAT_LABEL: Record<string, string> = {
  new_last_7_days: "New this week",
  active: "Active",
  awaiting_first_contact: "Uncontacted",
  stale_over_48h: "Stale 48h+",
  interviews_upcoming: "Upcoming",
  open_seats: "Open seats",
  offers_out: "Offers out",
  talent_pool: "Talent pool",
};
const STAT_ORDER = ["new_last_7_days", "active", "awaiting_first_contact", "stale_over_48h", "interviews_upcoming", "open_seats"];

export default function DailyBrief() {
  const { data, isLoading, error } = useLoginBrief();
  const refresh = useRefreshLoginBrief();
  const [expanded, setExpanded] = useState(true);

  const onRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: () => toast.success("Briefing refreshed"),
      onError: (e: any) => toast.error(e?.message || "Could not refresh the briefing"),
    });
  };

  const busy = isLoading || refresh.isPending;

  return (
    <section className="glass-panel rounded-2xl border border-emerald/25 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-border/70 bg-emerald/[0.05]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald/12 border border-emerald/30">
          <Bot className="h-4 w-4 text-emerald" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm sm:text-base font-semibold leading-tight">Your briefing</h2>
          <p className="text-[10px] text-muted-foreground truncate">
            {data?.generated_at
              ? `Generated ${new Date(data.generated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Personal AI summary of your pipeline"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald"
          onClick={onRefresh}
          disabled={busy}
          aria-label="Refresh briefing"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse briefing" : "Expand briefing"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {data?.stats && (
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-5 py-3 no-scrollbar">
          {STAT_ORDER.filter((k) => typeof data.stats[k] === "number").map((k) => (
            <div
              key={k}
              className="shrink-0 rounded-xl border border-border/70 bg-background/40 px-3 py-2 min-w-[86px]"
            >
              <p className="font-display text-lg font-bold leading-none">{data.stats[k]}</p>
              <p className="text-[9px] micro-label text-muted-foreground mt-1 whitespace-nowrap">{STAT_LABEL[k] ?? k}</p>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 pt-1">
          {isLoading && !data ? (
            <div className="inline-flex items-center gap-2 text-[13px] text-muted-foreground py-3">
              <Sparkles className="h-3.5 w-3.5 text-emerald animate-pulse" />
              <span className="claude-thinking">Reading your pipeline</span>
              <span className="claude-dots"><i /><i /><i /></span>
            </div>
          ) : error && !data ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-3 text-xs">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Briefing unavailable</p>
                <p className="text-muted-foreground mt-0.5">{(error as Error).message}</p>
              </div>
            </div>
          ) : data?.brief ? (
            <>
              {data.warning && (
                <p className="mb-2 text-[11px] text-gold inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> {data.warning}
                </p>
              )}
              <div className="text-[14px] text-foreground">
                <RichMessage content={data.brief} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-3">No briefing yet — refresh to generate one.</p>
          )}
        </div>
      )}
    </section>
  );
}
