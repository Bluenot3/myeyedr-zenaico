import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface HireRecord {
  id: string;
  region: string;
  site: string;
  hiringManager: string;
  candidateName: string;
  position: string;
  requisitionId: string;
  offerPacketSent: boolean;
  offerPacketReturned: boolean;
  idsReceived: boolean;
  backgroundCheckSent: boolean;
  backgroundCheckComplete: boolean;
  mandatedReporterComplete: boolean;
  clearanceType: string;
  dcSuitabilityNeeded: boolean;
  dcSuitabilityComplete: boolean;
  adpRegistrationSent: boolean;
  adpRegistrationComplete: boolean;
  nvoDate: string;
  nvoComplete: boolean;
  firstDayConfirmed: string;
  blockerNotes: string;
  currentPhase: PhaseNumber;
}

const phaseLabels: Record<PhaseNumber, string> = {
  1: "Requisition Ready",
  2: "Offer Sent",
  3: "Docs Returned",
  4: "Background Check",
  5: "Clearances",
  6: "ADP Registration",
  7: "NVO",
  8: "Cleared to Start",
};

const phaseBgMap: Record<PhaseNumber, string> = {
  1: "bg-phase-1/15 text-phase-1",
  2: "bg-phase-2/15 text-phase-2",
  3: "bg-phase-3/15 text-phase-3",
  4: "bg-phase-4/15 text-phase-4",
  5: "bg-phase-5/15 text-phase-5",
  6: "bg-phase-6/15 text-phase-6",
  7: "bg-phase-7/15 text-phase-7",
  8: "bg-phase-8/15 text-phase-8",
};

const sampleData: HireRecord[] = [
  {
    id: "1",
    region: "DC",
    site: "FBR Club",
    hiringManager: "T. Williams",
    candidateName: "Serenity Moore",
    position: "Youth Development Professional",
    requisitionId: "REQ-2025-0142",
    offerPacketSent: true,
    offerPacketReturned: true,
    idsReceived: true,
    backgroundCheckSent: true,
    backgroundCheckComplete: true,
    mandatedReporterComplete: false,
    clearanceType: "DC CPR + Suitability",
    dcSuitabilityNeeded: true,
    dcSuitabilityComplete: false,
    adpRegistrationSent: false,
    adpRegistrationComplete: false,
    nvoDate: "",
    nvoComplete: false,
    firstDayConfirmed: "",
    blockerNotes: "Awaiting Fieldprint fingerprinting appointment",
    currentPhase: 5,
  },
  {
    id: "2",
    region: "Maryland",
    site: "Germantown Club",
    hiringManager: "R. Patel",
    candidateName: "Marcus Johnson",
    position: "Program Coordinator",
    requisitionId: "REQ-2025-0158",
    offerPacketSent: true,
    offerPacketReturned: true,
    idsReceived: true,
    backgroundCheckSent: true,
    backgroundCheckComplete: true,
    mandatedReporterComplete: true,
    clearanceType: "MD CPS",
    dcSuitabilityNeeded: false,
    dcSuitabilityComplete: false,
    adpRegistrationSent: true,
    adpRegistrationComplete: true,
    nvoDate: "2025-04-02",
    nvoComplete: false,
    firstDayConfirmed: "",
    blockerNotes: "",
    currentPhase: 7,
  },
  {
    id: "3",
    region: "Virginia",
    site: "Hylton Club",
    hiringManager: "L. Chen",
    candidateName: "Aisha Thompson",
    position: "Club Director",
    requisitionId: "REQ-2025-0161",
    offerPacketSent: true,
    offerPacketReturned: false,
    idsReceived: false,
    backgroundCheckSent: false,
    backgroundCheckComplete: false,
    mandatedReporterComplete: false,
    clearanceType: "VA State Licensing",
    dcSuitabilityNeeded: false,
    dcSuitabilityComplete: false,
    adpRegistrationSent: false,
    adpRegistrationComplete: false,
    nvoDate: "",
    nvoComplete: false,
    firstDayConfirmed: "",
    blockerNotes: "Candidate requested extension on document return",
    currentPhase: 2,
  },
  {
    id: "4",
    region: "DC",
    site: "Jelleff Community Center",
    hiringManager: "T. Williams",
    candidateName: "David Park",
    position: "Sports & Recreation Lead",
    requisitionId: "REQ-2025-0147",
    offerPacketSent: true,
    offerPacketReturned: true,
    idsReceived: true,
    backgroundCheckSent: true,
    backgroundCheckComplete: true,
    mandatedReporterComplete: true,
    clearanceType: "DC CPR + Suitability",
    dcSuitabilityNeeded: true,
    dcSuitabilityComplete: true,
    adpRegistrationSent: true,
    adpRegistrationComplete: true,
    nvoDate: "2025-03-19",
    nvoComplete: true,
    firstDayConfirmed: "2025-03-19",
    blockerNotes: "",
    currentPhase: 8,
  },
  {
    id: "5",
    region: "Maryland",
    site: "Oxon Hill Middle School",
    hiringManager: "K. Adams",
    candidateName: "Rosa Hernandez",
    position: "Academic Success Coordinator",
    requisitionId: "REQ-2025-0165",
    offerPacketSent: true,
    offerPacketReturned: true,
    idsReceived: true,
    backgroundCheckSent: true,
    backgroundCheckComplete: false,
    mandatedReporterComplete: false,
    clearanceType: "MD CPS + PG Fingerprint",
    dcSuitabilityNeeded: false,
    dcSuitabilityComplete: false,
    adpRegistrationSent: false,
    adpRegistrationComplete: false,
    nvoDate: "",
    nvoComplete: false,
    firstDayConfirmed: "",
    blockerNotes: "Background check pending — submitted 3/18",
    currentPhase: 4,
  },
];

const Check = ({ checked }: { checked: boolean }) => (
  <span
    className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${
      checked
        ? "bg-success/15 text-success"
        : "bg-muted text-muted-foreground"
    }`}
  >
    {checked ? "✓" : "–"}
  </span>
);

const HiringTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("All");

  const filtered = sampleData.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      r.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requisitionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion =
      regionFilter === "All" || r.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  return (
    <section id="tracker" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">
            Hiring Tracker
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Track every candidate through each onboarding phase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, site, or req ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-64"
            />
          </div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="All">All Regions</option>
            <option value="DC">DC</option>
            <option value="Maryland">Maryland</option>
            <option value="Virginia">Virginia</option>
            <option value="Virtual">Virtual</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  Candidate
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  Position
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  Region / Site
                </th>
                <th className="text-center px-3 py-3 font-semibold text-foreground whitespace-nowrap">
                  Phase
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="Offer Sent">
                  OS
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="Offer Returned">
                  OR
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="IDs Received">
                  ID
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="Background Check Sent">
                  BCS
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="Background Check Complete">
                  BCC
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="Mandated Reporter">
                  MR
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="ADP Registration">
                  ADP
                </th>
                <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap" title="NVO Complete">
                  NVO
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  Clearance Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  Blockers / Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-foreground">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">{r.requisitionId}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground/85 whitespace-nowrap">
                    {r.position}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-foreground font-medium text-xs">{r.region}</p>
                    <p className="text-muted-foreground text-xs">{r.site}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${phaseBgMap[r.currentPhase]}`}
                    >
                      {r.currentPhase}. {phaseLabels[r.currentPhase]}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.offerPacketSent} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.offerPacketReturned} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.idsReceived} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.backgroundCheckSent} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.backgroundCheckComplete} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.mandatedReporterComplete} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.adpRegistrationComplete} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Check checked={r.nvoComplete} />
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/80 whitespace-nowrap">
                    {r.clearanceType}
                    {r.dcSuitabilityNeeded && (
                      <span className="block text-xs mt-0.5">
                        DC Suitability:{" "}
                        <span className={r.dcSuitabilityComplete ? "text-success font-medium" : "text-warning font-medium"}>
                          {r.dcSuitabilityComplete ? "Complete" : "Pending"}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                    {r.blockerNotes || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-muted-foreground">
                    No candidates match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Abbreviations — OS: Offer Sent · OR: Offer Returned · ID: IDs Received · BCS: Background Check Sent · BCC: Background Check Complete · MR: Mandated Reporter · ADP: ADP Registration · NVO: New VIP Orientation
      </p>
    </section>
  );
};

export default HiringTracker;
