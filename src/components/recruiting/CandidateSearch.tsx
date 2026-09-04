import { useEffect, useMemo, useState } from "react";
import { Search, Command as CommandIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCandidates, useLocations, Candidate } from "@/hooks/useRecruiting";
import { stageMeta, initials, relativeTime, prettyStatus } from "@/lib/recruiting";
import CandidateProfile from "./CandidateProfile";

interface Props {
  /** Compact icon-only trigger (mobile header) */
  compact?: boolean;
  className?: string;
}

export default function CandidateSearch({ compact, className }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: candidates = [] } = useCandidates();
  const { data: locations = [] } = useLocations();

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? candidates.filter((c) =>
          [c.full_name, c.email, c.phone, c.applied_role, c.headline, c.current_employer, ...(c.tags || [])]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(term)))
      : candidates;
    return pool.slice(0, 40);
  }, [candidates, q]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.site_name || "";

  const openCandidate = (c: Candidate) => {
    setSelected(c);
    setProfileOpen(true);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Search candidates (⌘K)"
        aria-label="Search candidates"
        className={
          compact
            ? `neu-btn h-9 w-9 ${className || ""}`
            : `neu-btn h-9 w-full gap-2 px-3 text-[11px] font-medium justify-start text-muted-foreground ${className || ""}`
        }
      >
        <Search className="h-4 w-4 shrink-0" />
        {!compact && (
          <>
            <span className="truncate">Search candidates</span>
            <span className="ml-auto hidden xl:inline-flex items-center gap-0.5 rounded border border-border/70 px-1 py-0.5 text-[9px] font-mono text-muted-foreground/80">
              <CommandIcon className="h-2.5 w-2.5" />K
            </span>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, phone, role or employer…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="text-[10px] text-muted-foreground nums">{results.length}</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 && (
              <p className="px-3 py-10 text-center text-xs text-muted-foreground">
                {candidates.length === 0 ? "No candidates yet." : `No one matches “${q}”.`}
              </p>
            )}
            {results.map((c) => {
              const meta = stageMeta(c.stage);
              return (
                <button
                  key={c.id}
                  onClick={() => openCandidate(c)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: `hsl(${meta.hsl} / 0.16)`, color: `hsl(${meta.hsl})` }}
                  >
                    {initials(c.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground truncate">{c.full_name}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {[c.applied_role || c.headline, locName(c.location_id)].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[10px] font-medium" style={{ color: `hsl(${meta.hsl})` }}>
                      {c.in_talent_pool ? "Talent pool" : prettyStatus(c.stage)}
                    </span>
                    <span className="block text-[9px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <CandidateProfile candidate={selected} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
