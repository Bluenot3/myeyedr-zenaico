import { Star, Phone, Mail, MapPin, Sparkles, MessageSquare, CheckSquare, Square } from "lucide-react";
import { Candidate } from "@/hooks/useRecruiting";
import { stageProgress, stageMeta, initials, relativeTime, scoreTone, TONE_HSL } from "@/lib/recruiting";
import StageBadge from "./StageBadge";

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
  const progress = stageProgress(c.stage);
  const sTone = TONE_HSL[scoreTone(c.score)];

  return (
    <div className="glass-panel rounded-xl p-3.5 hover-lift tap-target group">
      <div className="flex items-start gap-3">
        {selectable && (
          <button onClick={onToggleSelect} className="pt-1 shrink-0 tap-target">
            {selected ? <CheckSquare className="h-4 w-4 text-emerald" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
          </button>
        )}

        {/* Avatar */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display font-bold text-sm"
          style={{ background: `hsl(${meta.hsl} / 0.14)`, color: `hsl(${meta.hsl})`, border: `1.5px solid hsl(${meta.hsl} / 0.4)` }}
        >
          {initials(c.full_name)}
        </div>

        {/* Main */}
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{c.full_name}</span>
            {c.in_talent_pool && <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" aria-label="Talent pool" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{c.applied_role || c.headline}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StageBadge stage={c.stage} size="sm" />
            {c.rating > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < c.rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                ))}
              </span>
            )}
          </div>

          {/* progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-secondary/70 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `hsl(${meta.hsl})` }} />
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {locationName && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5" /> {locationName}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-2.5 w-2.5" /> {c.contact_count} · {relativeTime(c.last_contacted_at)}
            </span>
          </div>
        </button>

        {/* Score */}
        <div className="shrink-0 text-right">
          <div
            className="font-display text-xl font-bold leading-none"
            style={{ color: `hsl(${sTone})` }}
          >
            {c.score}
          </div>
          <p className="micro-label text-[8px] text-muted-foreground mt-0.5">score</p>
        </div>
      </div>
    </div>
  );
}
