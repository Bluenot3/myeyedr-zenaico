import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ClearanceItem {
  region: string;
  items: string[];
}

interface Phase {
  number: number;
  title: string;
  definition: string;
  owner: string;
  completionCriteria: string;
  clearances?: ClearanceItem[];
}

const phases: Phase[] = [
  {
    number: 1,
    title: "Position / Requisition Ready",
    definition:
      "Position approved and requisition opened in ADP. The recruitment process starts with manager communication and completing the requisition in ADP with manager and HR approval.",
    owner: "Hiring Manager + HR",
    completionCriteria:
      "Requisition approved in ADP with job description, pay rate, and location confirmed.",
  },
  {
    number: 2,
    title: "Candidate Selected / Offer Packet Sent",
    definition:
      "Candidate receives the offer letter packet, Personnel Information Sheet, and List of Acceptable IDs.",
    owner: "HR",
    completionCriteria:
      "Offer letter packet, Personnel Information Sheet, and ID instructions sent to the candidate.",
  },
  {
    number: 3,
    title: "Hiring Documents Returned",
    definition:
      "Signed offer letter, completed Personnel Information Sheet, and copies of acceptable IDs received and verified.",
    owner: "HR",
    completionCriteria:
      "All signed documents and valid IDs on file. Background check link can now be sent.",
  },
  {
    number: 4,
    title: "Background Check In Progress / Complete",
    definition:
      "Trusted Employee background check initiated and returned. HR sends the background check link only after all offer documents and IDs are received.",
    owner: "HR + Trusted Employee",
    completionCriteria:
      "Background check completed and cleared through Trusted Employee.",
  },
  {
    number: 5,
    title: "Required Clearances / Mandated Reporter",
    definition:
      "Location-specific clearances and Mandated Reporter training completed. Requirements vary by region — this phase branches based on the candidate's assigned site.",
    owner: "Candidate + HR",
    completionCriteria:
      "All applicable clearances and Mandated Reporter certification on file.",
    clearances: [
      {
        region: "DC",
        items: [
          "DC Child Protection Register (CPR)",
          "DC Suitability Clearance (outreach to DCHR, external background check/fingerprinting via TrueScreen and Fieldprint, affidavit upload in Cityspan)",
          "BGC Mandated Reporter Training",
        ],
      },
      {
        region: "Maryland",
        items: [
          "Maryland Child Protective Services (CPS)",
          "PG County Fingerprint (where applicable)",
          "BGC Mandated Reporter Training",
        ],
      },
      {
        region: "Virginia",
        items: [
          "Virginia State Licensing clearance",
          "BGC Mandated Reporter Training",
        ],
      },
    ],
  },
  {
    number: 6,
    title: "ADP Registration",
    definition:
      "HR sends or initiates the ADP registration email after all preliminary onboarding items are completed. The candidate receives this before orientation.",
    owner: "HR",
    completionCriteria: "ADP registration email sent and completed by the candidate.",
  },
  {
    number: 7,
    title: "NVO Scheduled / Completed",
    definition:
      "New VIP Orientation date assigned. NVO occurs every 2 weeks, all new VIPs start on a Wednesday, and VIPs cannot start before completing NVO. Mandated Reporter and CPS/CPR must be submitted prior to attendance.",
    owner: "HR + Hiring Manager",
    completionCriteria:
      "NVO attended and completed. Hiring manager receives confirmation from HR.",
  },
  {
    number: 8,
    title: "Cleared to Start / First Day Confirmed",
    definition:
      "Final status confirming all hiring requirements are met. Start date is confirmed once the entire onboarding pipeline is complete.",
    owner: "HR + Hiring Manager",
    completionCriteria:
      "All phases complete, start date set, and candidate confirmed to begin at their assigned location.",
  },
];

const phaseColorMap: Record<number, string> = {
  1: "bg-phase-1",
  2: "bg-phase-2",
  3: "bg-phase-3",
  4: "bg-phase-4",
  5: "bg-phase-5",
  6: "bg-phase-6",
  7: "bg-phase-7",
  8: "bg-phase-8",
};

const OnboardingPhases = () => {
  return (
    <section id="phases" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-foreground">
          Onboarding Phases
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Each phase has a definition, owner, and clear completion criteria. All
          steps must be completed before a candidate can begin work.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {phases.map((phase) => (
          <AccordionItem
            key={phase.number}
            value={`phase-${phase.number}`}
            className="bg-card rounded-lg border border-border shadow-sm overflow-hidden data-[state=open]:shadow-md transition-shadow"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 text-left">
                <span
                  className={`${phaseColorMap[phase.number]} text-primary-foreground text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0`}
                >
                  {phase.number}
                </span>
                <span className="font-display font-semibold text-foreground">
                  {phase.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="pl-10 space-y-4">
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {phase.definition}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/60 rounded-md px-3.5 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                      Owner
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {phase.owner}
                    </p>
                  </div>
                  <div className="bg-muted/60 rounded-md px-3.5 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                      Done When
                    </p>
                    <p className="text-sm text-foreground">
                      {phase.completionCriteria}
                    </p>
                  </div>
                </div>

                {phase.clearances && (
                  <div className="bg-muted/40 rounded-md p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Location-Specific Clearances
                    </p>
                    {phase.clearances.map((c) => (
                      <div key={c.region}>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {c.region}
                        </p>
                        <ul className="space-y-1">
                          {c.items.map((item) => (
                            <li
                              key={item}
                              className="text-sm text-foreground/80 flex items-start gap-2"
                            >
                              <span className="text-accent mt-1.5 shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default OnboardingPhases;
