import { useMemo, useState } from "react";
import { Target, Loader2, Sparkles, UserCheck, Check } from "lucide-react";
import {
  Position,
  Candidate,
  useGoldenProfiles,
  useSaveGoldenProfile,
  generateGoldenProfile,
} from "@/hooks/useRecruiting";
import { goldenFromCandidate, GoldenProfile } from "@/lib/golden";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Per-position "Best Fit" benchmark. Sets the active Golden profile for a
 * requisition — either modeled on a strong existing candidate or generated
 * from the job description. This benchmark drives each candidate's
 * pre-screening general score (see lib/golden generalScore).
 */
export default function BestFitControl({ position, candidates }: { position: Position; candidates: Candidate[] }) {
  const { data: goldens = [] } = useGoldenProfiles();
  const saveGolden = useSaveGoldenProfile();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = useMemo(
    () => goldens.find((g) => g.is_active && g.position_id === position.id),
    [goldens, position.id],
  );

  const posCandidates = useMemo(
    () =>
      candidates
        .filter((c) => c.position_id === position.id)
        .sort((a, b) => (b.score || 0) - (a.score || 0)),
    [candidates, position.id],
  );

  const deactivateOthers = async () => {
    const others = goldens.filter((g) => g.is_active && g.position_id === position.id);
    for (const g of others) {
      await saveGolden.mutateAsync({ id: g.id, is_active: false });
    }
  };

  const setFromCandidate = async (c: Candidate) => {
    setBusy(true);
    try {
      await deactivateOthers();
      const draft = goldenFromCandidate(c);
      await saveGolden.mutateAsync({
        ...(draft as Partial<GoldenProfile>),
        position_id: position.id,
        role: position.title,
        is_active: true,
      });
      toast.success(`Best fit set from ${c.full_name.split(" ")[0]}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Could not set best fit");
    } finally {
      setBusy(false);
    }
  };

  const generateFromRole = async () => {
    setBusy(true);
    try {
      const context = [position.description, position.requirements, position.pay_range]
        .filter(Boolean)
        .join("\n");
      const draft = await generateGoldenProfile({ mode: "from_position", role: position.title, context });
      await deactivateOthers();
      await saveGolden.mutateAsync({
        ...(draft as Partial<GoldenProfile>),
        position_id: position.id,
        role: position.title,
        is_active: true,
      });
      toast.success("Best-fit benchmark generated");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Could not generate benchmark");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full mt-3 rounded-lg border p-2.5 flex items-center gap-2 text-left transition-colors ${
          active
            ? "border-gold/40 bg-gold/10 hover:bg-gold/15"
            : "border-border/60 bg-background/40 hover:border-gold/30"
        }`}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gold/15 border border-gold/30 shrink-0">
          <Target className="h-3.5 w-3.5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground truncate">
            {active ? active.name : "Set best-fit benchmark"}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {active ? "Drives pre-screening scores · tap to change" : "Define the ideal candidate for this role"}
          </p>
        </div>
        {active && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md glass-panel max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-gold" /> Best fit — {position.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">
              The best-fit benchmark defines your ideal candidate. Every applicant is auto-scored against it (plus job-title match) to produce their pre-screening score — before screening and interview scorecards are filled.
            </p>

            <div>
              <p className="micro-label text-[9px] text-muted-foreground mb-1.5">Generate from the job description</p>
              <Button onClick={generateFromRole} disabled={busy} className="w-full bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate ideal profile
              </Button>
            </div>

            <div>
              <p className="micro-label text-[9px] text-muted-foreground mb-1.5">Or model it on a strong applicant</p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-1.5 space-y-1">
                {posCandidates.length === 0 && (
                  <p className="text-[11px] text-muted-foreground p-2">No applicants on this requisition yet.</p>
                )}
                {posCandidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFromCandidate(c)}
                    disabled={busy}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left hover:bg-muted/40 disabled:opacity-50"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
                    <span className="truncate flex-1">{c.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.score || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
