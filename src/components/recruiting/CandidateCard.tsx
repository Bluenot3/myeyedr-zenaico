import { Star, MapPin, Sparkles, MessageSquare, CheckSquare, Square, ChevronRight } from "lucide-react";
import { Candidate } from "@/hooks/useRecruiting";
import { stageMeta, initials, relativeTime } from "@/lib/recruiting";
import { computeMatch, nextAction } from "@/lib/matchScore";
import StageBadge from "./StageBadge";
import ScoreRing from "./ScoreRing";
import { MatchBadgeChip, MeterBar } from "./MatchVisuals";

interface Props {
  candidate: Candidate;
  locationName?: string;
  onOpen: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function CandidateCard({ candidate: c, locationName, onOpen, selectable, selected, onToggleSelect }: Props) {
  const meta = stageMeta(c.stage);
  const m = computeMatch(c);
  const action = nextAction(c, m);
  const topBadges = m.badges.slice(0, 3);

  return (
    <div
      className="holo-card relative rounded-xl p-3.5 hover-lift tap-target group overflow-hidden"
      style={{ borderColor: `hsl(${m.categoryHsl} / 0.28)` }}
    >
      {/* holographic sheen edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, hsl(${m.categoryHsl} / 0.7), transparent)` }}
      />

      <div className="flex items-start gap-3">
        {selectable && (
          <button onClick={onToggleSelect} className="pt-1 shrink-0 tap-target">
            {selected ? <CheckSquare className="h-4 w-4 text-emerald" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
          </button>
        )}

        {/* Score ring */}
        <button onClick={onOpen} className="shrink-0">
          <ScoreRing score={m.overall} size={52} stroke={5} />
        </button>

        {/* Main */}
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold" style={{ background: `hsl(${meta.hsl} / 0.14)`, color: `hsl(${meta.hsl})` }}>{initials(c.full_name)}</span>
            <span className="text-sm font-semibold text-foreground truncate">{c.full_name}</span>
            {c.in_talent_pool && <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" aria-label="Talent pool" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.applied_role || c.headline}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StageBadge stage={c.stage} size="sm" />
            <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ color: `hsl(${m.categoryHsl})`, background: `hsl(${m.categoryHsl} / 0.12)` }}>{m.gameStatus}</span>
          </div>
        </button>
      </div>

      {/* badges */}
      {topBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {topBadges.map((b) => <MatchBadgeChip key={b.label} badge={b} />)}
        </div>
      )}

      {/* availability meter */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground">Availability {m.availability.cap != null && <span style={{ color: `hsl(${m.availability.hsl})` }}>· caps {m.availability.cap}</span>}</span>
          <span className="text-[9px] font-bold" style={{ color: `hsl(${m.availability.hsl})` }}>{m.availability.fit}</span>
        </div>
        <MeterBar value={m.availability.fit} hsl={m.availability.hsl} height={4} />
      </div>

      {/* footer: next action + meta */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 min-w-0"
          style={{
            color: action.urgency === "high" ? "hsl(28 86% 63%)" : "hsl(161 66% 57%)",
            background: action.urgency === "high" ? "hsl(28 86% 63% / 0.12)" : "hsl(161 66% 57% / 0.1)",
          }}
        >
          <ChevronRight className="h-3 w-3 shrink-0" /> <span className="truncate">{action.label}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground shrink-0">
          <MessageSquare className="h-2.5 w-2.5" /> {c.contact_count} · {relativeTime(c.last_contacted_at)}
        </span>
      </div>

      {locationName && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-muted-foreground truncate">
          <MapPin className="h-2.5 w-2.5" /> {locationName}
        </p>
      )}
    </div>
  );
}
