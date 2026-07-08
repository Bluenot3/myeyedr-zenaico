import { useMemo, useState } from "react";
import { Share2, X, Plus, Building2, Loader2 } from "lucide-react";
import {
  Candidate,
  useLocations,
  useCandidateShares,
  useShareCandidate,
  useUnshareCandidate,
} from "@/hooks/useRecruiting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Cross-location sharing. A store can grant another office view access to this
 * candidate; everyone assigned to that office can then see the candidate.
 */
export default function ShareToLocation({ candidate }: { candidate: Candidate }) {
  const { data: locations = [] } = useLocations();
  const { data: shares = [] } = useCandidateShares(candidate.id);
  const share = useShareCandidate();
  const unshare = useUnshareCandidate();

  const [locId, setLocId] = useState("");
  const [note, setNote] = useState("");

  const locName = (id: string) => locations.find((l) => l.id === id)?.site_name ?? "Office";

  // Offices not the candidate's own and not already shared with.
  const available = useMemo(
    () =>
      locations.filter(
        (l) => l.id !== candidate.location_id && !shares.some((s) => s.location_id === l.id),
      ),
    [locations, shares, candidate.location_id],
  );

  const doShare = async () => {
    if (!locId) return;
    await share.mutateAsync({ candidate_id: candidate.id, location_id: locId, note: note.trim() || undefined });
    setLocId("");
    setNote("");
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="h-4 w-4 text-cyan" />
        <h4 className="text-sm font-semibold text-foreground">Share with another office</h4>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Grant another location view access to this candidate. Managers at that office will be able to see them.
      </p>

      {shares.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {shares.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-[11px] rounded-full pl-2.5 pr-1.5 py-1 bg-cyan/10 text-cyan border border-cyan/25"
            >
              <Building2 className="h-3 w-3" /> {locName(s.location_id)}
              <button
                onClick={() => unshare.mutate({ id: s.id, candidate_id: candidate.id })}
                className="rounded-full p-0.5 hover:bg-cyan/20"
                aria-label="Remove share"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={locId} onValueChange={setLocId}>
          <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="Select an office…" /></SelectTrigger>
          <SelectContent>
            {available.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No other offices available</div>}
            {available.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.site_name}<span className="text-muted-foreground/60 ml-1">{l.region}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-9 text-xs flex-1"
        />
        <Button
          onClick={doShare}
          disabled={!locId || share.isPending}
          className="h-9 bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25 shrink-0"
        >
          {share.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Share
        </Button>
      </div>
    </div>
  );
}
