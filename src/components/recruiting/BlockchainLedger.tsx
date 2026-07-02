import { useState } from "react";
import { ChevronDown, Copy, ExternalLink, Link2, ShieldCheck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CandidateBadge } from "@/hooks/useRecruiting";
import { badgeMeta, TONE_HSL, shortHash, relativeTime } from "@/lib/recruiting";
import HoloStrip from "./HoloStrip";
import { toast } from "sonner";

function statusStyle(status: string) {
  switch (status) {
    case "verified":
      return { color: "hsl(var(--emerald))", icon: CheckCircle2, label: "Verified" };
    case "pending":
      return { color: "hsl(var(--gold))", icon: Clock, label: "Pending" };
    case "flagged":
      return { color: "hsl(var(--destructive))", icon: AlertTriangle, label: "Flagged" };
    default:
      return { color: "hsl(var(--holo))", icon: ShieldCheck, label: status };
  }
}

function LedgerBlock({ badge, isLast }: { badge: CandidateBadge; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = badgeMeta(badge.badge_type);
  const Icon = meta.icon;
  const toneHsl = TONE_HSL[meta.tone];
  const st = statusStyle(badge.status);
  const StatusIcon = st.icon;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const detailEntries = Object.entries(badge.detail || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="relative pl-9">
      {/* chain rail */}
      <div className="absolute left-[14px] top-8 bottom-0 w-px" style={{ background: isLast ? "transparent" : `linear-gradient(hsl(${toneHsl} / 0.5), hsl(var(--border)))` }} />
      {/* node */}
      <div
        className="absolute left-1.5 top-2 flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: `hsl(${toneHsl} / 0.14)`, border: `1px solid hsl(${toneHsl} / 0.5)`, boxShadow: `0 0 12px -4px hsl(${toneHsl} / 0.7)` }}
      >
        <Icon className="h-3 w-3" style={{ color: `hsl(${toneHsl})` }} />
      </div>

      <div className="glass-panel rounded-lg overflow-hidden mb-3 hover:border-emerald/30 transition-colors">
        <button onClick={() => setOpen((o) => !o)} className="w-full text-left tap-target">
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
              #{String(badge.block_index).padStart(3, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{badge.title}</p>
              <p className="text-[10px] micro-label text-muted-foreground truncate">{meta.label}</p>
            </div>
            {badge.score != null && (
              <span className="font-display font-bold text-sm shrink-0" style={{ color: `hsl(${toneHsl})` }}>
                {badge.score}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide shrink-0"
              style={{ color: st.color, background: `${st.color.replace(")", " / 0.12)")}`, border: `1px solid ${st.color.replace(")", " / 0.3)")}` }}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">{st.label}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </button>

        {open && (
          <div className="px-3.5 pb-3.5 pt-0 animate-rise">
            <HoloStrip className="mb-3" />
            {badge.summary && <p className="text-xs text-foreground/85 mb-3">{badge.summary}</p>}

            {detailEntries.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {detailEntries.map(([k, v]) => (
                  <div key={k} className="rounded-md bg-background/40 px-2.5 py-1.5 border border-border/60">
                    <p className="micro-label text-muted-foreground text-[9px] mb-0.5 truncate">{k.replace(/_/g, " ")}</p>
                    <p className="text-xs text-foreground truncate">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
                  </div>
                ))}
              </div>
            )}

            {badge.badge_type === "resume" && (
              <div className="mb-3">
                {badge.file_url ? (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <iframe title="Résumé" src={badge.file_url} className="w-full h-64 bg-background" />
                    <a href={badge.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2 text-xs text-emerald hover:bg-muted/40">
                      <ExternalLink className="h-3 w-3" /> Open full résumé
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No file attached — showing structured résumé data above.</p>
                )}
              </div>
            )}

            {/* Ledger provenance */}
            <div className="rounded-md bg-background/50 border border-border/60 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-3 w-3 text-emerald" />
                <span className="micro-label text-[9px] text-emerald">Ledger Record</span>
                <span className="micro-label text-[9px] text-muted-foreground ml-auto">{new Date(badge.issued_at).toLocaleString()}</span>
              </div>
              <button onClick={() => copy(badge.hash, "Hash")} className="flex items-center gap-2 w-full text-left group tap-target">
                <span className="micro-label text-[9px] text-muted-foreground w-12">hash</span>
                <span className="font-mono text-[10px] text-foreground/80 truncate flex-1">{badge.hash}</span>
                <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0" />
              </button>
              <div className="flex items-center gap-2">
                <span className="micro-label text-[9px] text-muted-foreground w-12">prev</span>
                <Link2 className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="font-mono text-[10px] text-muted-foreground/70 truncate flex-1">{shortHash(badge.prev_hash)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="micro-label text-[9px] text-muted-foreground w-12">issuer</span>
                <span className="text-[10px] text-foreground/70">{badge.issued_by}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlockchainLedger({ badges }: { badges: CandidateBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No credential blocks yet.</p>
        <p className="text-xs mt-0.5">Seal résumé, screening, and evaluation records to build the chain.</p>
      </div>
    );
  }
  return (
    <div className="relative">
      {badges.map((b, i) => (
        <LedgerBlock key={b.id} badge={b} isLast={i === badges.length - 1} />
      ))}
    </div>
  );
}
