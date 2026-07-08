# Plan: Bigger/cleaner candidate evaluation, requisition auto-close rule, and action-taking admin AI

Three focused changes to the existing recruiting workflow. Pipeline candidate cards (`CandidateCard.tsx`) are left **completely untouched**.

---

## 1. Larger, minimalist candidate evaluation & profile

Goal: make it easier to read scores and move candidates through the process, without changing what data is captured.

**`CandidateProfile.tsx`**
- Widen the slide-over from `sm:max-w-2xl` to `sm:max-w-3xl lg:max-w-4xl` so evaluations have room to breathe.
- Streamline the top of the panel into a calmer, minimalist layout:
  - Keep the header (name, match ring, stars) but reduce visual noise.
  - Merge the **stage stepper** and **decision bar** into one clear "Move through pipeline" block: a single-row stage progression plus prominent Hire / Pool / Reject actions, larger tap targets, consistent spacing.
- No tab or data changes — same Match/Signals/Scores/Media/etc. tabs.

**`EvaluationPanel.tsx`**
- Roomier, minimalist layout: larger template-picker rows, bigger star controls, cleaner competency cards, more whitespace, clearer "Start an evaluation" and "Evaluator scorecards" sections.
- Same templates, ratings, weighted scoring, and save behavior.

Purely presentational; no scoring-logic changes.

---

## 2. Requisition headcount rule (fill enough seats → close & pool the rest)

Each opening already has an `openings` count (seats) and a `status`. New rule, driven by hires:

When a candidate becomes **hired** (via the Hire button **or** by setting stage to Hired in the stepper):
1. Count candidates on the same `position_id` whose status is `hired`.
2. If `hiredCount >= position.openings`:
   - Set that position's `status = "filled"` (closes the requisition).
   - Move every remaining candidate on that requisition who is **still active** (not `hired`, not `rejected`) into the talent pool: `in_talent_pool = true` with a reason like "Requisition {req_code} filled — kept warm for future roles". Their history is preserved.
3. If seats remain open, nothing else changes and a toast shows progress (e.g. "Hired — 2 of 3 seats filled").

**Implementation (`useRecruiting.ts` → `useCandidateLifecycle`)**
- Extend the `hire` mutation: after marking the candidate hired, load the linked position + its candidates, apply the count/close/pool logic above, and invalidate `candidates` + `positions`.
- Add a shared `hireCandidate` path so the stage stepper's "Hired" selection routes through the same logic (satisfies the "both triggers" choice).

**`CandidateProfile.tsx`**
- `handleStage("hired")` calls the lifecycle hire flow instead of a plain stage update, so the rule fires from the stepper too.

Scoping is inherently per-requisition via `position_id`, so it stays within the correct location. Writes use existing RLS-scoped mutations.

---

## 3. Admin-only AI assistant that proposes actions (confirm before running)

**Access gating (`Index.tsx`)**
- Mark the `askai` nav item `adminOnly: true` and render `<CandidateAssistant />` only when `isAdmin`.
- Render `<FloatingAssistant />` only when `isAdmin`.

**Action-taking (propose → confirm)**

Backend (`supabase/functions/candidate-assistant/index.ts`)
- Include each candidate's `id` in the compact dataset (already RLS-scoped, safe) so actions can target the right person.
- Add tool/function definitions to the gateway call (Gemini supports tools): `move_stage`, `hire_candidate`, `pool_candidate`, `reject_candidate`, `add_note`, `share_to_location`, `update_candidate_info`.
- The function does **not** execute tools. When the model requests tools, it returns a structured `proposed_actions[]` (each with candidate id, name, action type, params, and a plain-English description) alongside the assistant's text reply. Comparisons / questions / info lookups still return as normal markdown text.

Frontend (`AssistantChat.tsx`)
- Render any `proposed_actions` as clean action cards under the assistant message, each with **Confirm** and **Dismiss**.
- On Confirm, execute through existing client hooks/RLS-scoped mutations:
  - stage/info → `useUpdateCandidate`
  - hire/pool/reject → `useCandidateLifecycle` (so the requisition rule from part 2 also applies to AI-driven hires)
  - notes → `useAddNote`
  - share → existing share-to-location mutation
- After execution, show a success state on the card and a toast; on error, surface it. This keeps every write on validated, permissioned paths while the AI only ever *proposes*.

---

## Technical notes
- Model stays `google/gemini-2.5-flash` (supports tool calling) via the Lovable AI Gateway; 402/429 handling preserved.
- Reuse existing mutations for all writes — no new tables or migrations required (headcount `openings` + position `status` already exist).
- Validation: typecheck/build, then verify in preview — evaluation panel sizing, hiring enough candidates closes a requisition and pools the rest, and the AI proposes an action that runs only after Confirm. AI surfaces are hidden for non-admins.

## Out of scope / unchanged
- `CandidateCard.tsx` and the pipeline board card layout — untouched per your request.
- Existing scoring, golden-profile, onboarding, and sharing logic remain intact.
