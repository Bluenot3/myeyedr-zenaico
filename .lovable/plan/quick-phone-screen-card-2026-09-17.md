# Quick Phone Screen Card

A 10–15 minute universal phone screen that any manager can finish in one pass, then export as a PDF or image that stays attached to the candidate's file forever.

## What the manager sees

At the top of a candidate's Evaluation tab, a new primary button: **Quick Phone Screen (10 min)** — separate from the longer role-specific scorecards, which stay exactly as they are.

The card itself is one screen, no scrolling between sections:

- **Header** — candidate name, role, office, date, who is screening.
- **Six quick judgments**, each a single tap on a 5-point strip (no typing required):
  1. Availability & schedule fit — can they work the hours, commute, start date
  2. Attendance & reliability — honest about their record, has a real backup plan
  3. Communication & phone presence — clear, warm, easy to understand
  4. Work ethic & drive — a concrete example of hard work, not a generic answer
  5. Motivation & stability — why this role, why now, looks after their own career
  6. Attitude & coachability — speaks well of past teams, takes feedback
  These apply to every position, so the card never needs a role-specific version.
- **Three fast checkboxes** — confirmed pay range, confirmed schedule, confirmed start date.
- **Two short free-text lines** — "one thing that stood out" and "one concern" (optional).
- **Red-flag chips** — one tap each: vague availability, negative about past employers, no examples, missed the call, dodged attendance question.
- **Verdict** — Advance to interview / Hold / Talent pool / Pass. One tap.

A live score ring and a running "3 of 6 rated" counter sit in the header so the manager can see it's complete at a glance. Saving takes one button.

## Attachment and export

When saved, the card:
- saves as a normal evaluation on the candidate so it appears in their evaluation history and feeds existing scores,
- renders itself into a clean printable card and uploads that as a **PDF and a PNG** to the candidate's documents,
- seals a "Phone Screen" credential on the candidate's Chain of Record with the score, verdict and links to both files.

From then on, both files are permanently listed on the candidate's file with download buttons, and can be re-downloaded or re-shared any time. The manager can also export without saving (a **PDF** / **PNG** button on the card) for a quick copy.

## Technical notes

- New `src/components/recruiting/QuickPhoneScreen.tsx`: the fill card plus a print-optimised render target.
- New shared definition in `src/lib/evaluationBlueprints.ts` (`QUICK_PHONE_SCREEN`) so the six dimensions, weights and prompts live with the other blueprints.
- Export uses the already-installed `html2canvas` + `jspdf`; upload uses `uploadCandidateFile` in `src/lib/storage.ts` (candidate-documents bucket).
- Persistence: `useCreateEvaluation` with `template_id: null`, `template_name: "Quick Phone Screen"`, ratings + `details` holding checkboxes, flags, standout/concern text and the two file URLs; then `useAddBadge` with `badge_type: "phone_screen"` and `file_url` for the ledger seal.
- Entry point added in `EvaluationPanel.tsx` only; existing rich phone-screen and interview forms, templates and scoring are untouched.
- Validation: `bunx tsgo --noEmit`, `bunx vitest run`, build, plus a Playwright pass filling and exporting the card.
