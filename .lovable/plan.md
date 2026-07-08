# Locations, Location-Scoped Access, AI Assistant & Best-Fit Scoring

Focused extension of the existing recruiting app. No redesign of unrelated areas.

## 1. Load & manage all locations

**Add 21 Greater-Philadelphia offices** (the existing "Ardmore" record is updated to Ardmore/Wynnewood — 250 E Lancaster Ave, and the remaining 20 are inserted). Grouped into sensible sub-regions so the Locations screen stays organized (adjustable later):

```text
Delaware County   : Ardmore/Wynnewood, Havertown, Media, Newtown Square, Upper Chichester
Chester County    : Chester Springs, Downingtown/Caln, Exton, Longwood Village (Kennett Sq), Oxford, West Chester/West Goshen
Bucks County      : Doylestown, Fairless Hills, Newtown–Pheasant Run, Newtown–S Eagle Rd, Southampton
Montgomery County : Horsham, Lansdale, Rockledge
Lehigh Valley     : Bethlehem, Whitehall
```

- **Migration:** add `address` and `manager_email` columns to `locations`.
- **LocationsManager.tsx:** add **Street address** and **Manager email** fields to the Add/Edit office forms and show them on each office card. Adding new offices already works and stays.
- **recruiting.ts:** update `REGIONS` + region color dots to the five PA groupings above.

## 2. Manager email + location-scoped invites

The invite flow already assigns a manager to specific locations (`user_locations`). We reinforce it:
- Locations now carry a **manager name + email** so an admin can pre-designate who runs each office.
- When that person is invited (Team & Access → Invite, role **Manager**, pick their location(s)), they sign in scoped to those locations only — RLS already blocks other locations' candidates/openings.

## 3. Three permanent admins

Update the account-creation trigger (`handle_new_user`) so these emails always receive the **admin** role on sign-up (case-insensitive), and grant it now to any already-created accounts:
- alexander.leschik@myeyedr.com
- Rebecca.Cochran@myeyedr.com
- kimberly.avanzato@myeyedr.com

Admins/Regionals keep full visibility of every location and feature.

## 4. Cross-location candidate sharing ("share to another location")

New table **`candidate_location_shares`** (`candidate_id`, `location_id` = target office, `shared_by`, `note`, `created_at`) with GRANTs, RLS, and policies (a user may share candidates they can access; admins/regionals unrestricted).

- Update the `can_access_candidate()` security-definer function so a manager can view a candidate if the candidate belongs to one of their locations **or** the candidate has been shared to one of their locations.
- **UI:** a **"Share to location"** action on the candidate profile (and row action in the table) lets a manager grant another office view access, with an optional note; shared offices are listed and can be revoked. Sharing is view-only.

## 5. Best-fit / Golden Profile drives the pre-screening score

Uses the **existing Golden Profile engine** (`golden_profiles` already has `position_id` + `is_active`; `computeGoldenFit` already exists).

- **Per-position best fit:** in **Openings**, each requisition gets a "Best Fit" control to select an existing candidate as the ideal, generate one via the existing `generate-golden-profile` function, or reuse a saved Golden Profile — saved as the **active golden for that position**.
- **General score:** new helper `generalScore(candidate, positions, goldens)` in `src/lib/matchScore.ts` (or a small new module). When the candidate's position has an active golden, the pre-score = blend of **Golden fit** + **job-title match** (candidate applied role/best-fit roles vs. the requisition title) + base signals. When no golden is set it falls back to today's `computeMatch`. This is the score shown **before** screening/interview scorecards are filled; once real scorecard ratings exist they feed in as they do now.
- Cards, table, and Overview read this general score so managers see a meaningful pre-score immediately after upload.

## 6. AI candidate assistant (tab + floating chat)

A conversational assistant that answers questions about candidates, compares them, and surfaces best-fit recommendations — **scoped to what the current user is allowed to see** (managers only get their location + shared candidates; admins/regionals get everything).

- **Edge function `candidate-assistant`** using Lovable AI Gateway. It authenticates the caller, loads only that user's visible candidates (via their token / access helpers), builds a compact context (name, role, location, stage, scores, golden fit, availability, tags, summary), and streams answers. Handles rate-limit (429) and credit (402) errors in the UI.
- **Dedicated "Ask AI" tab** (`CandidateAssistant.tsx`) — full-page workspace to query and compare candidates, with example prompts (e.g. "Compare the top 3 for the Exton optician req", "Who's the best fit for Media?").
- **Floating chat** — a launcher available across the app opening the same assistant.
- Single conversation, no persistence (session-only) to keep it focused; markdown rendering for responses.

## Technical notes
- **Migrations:** `locations` columns; `candidate_location_shares` table (+GRANTs/RLS/policies); updated `can_access_candidate()`; updated `handle_new_user()`.
- **Data (insert tool):** update Ardmore→Wynnewood, insert 20 offices, grant admin role to the three emails' existing accounts.
- **New files:** `src/components/recruiting/CandidateAssistant.tsx`, floating chat component, `supabase/functions/candidate-assistant/index.ts`.
- **Edited:** `LocationsManager.tsx`, `recruiting.ts`, `useRecruiting.ts` (Location type + share hooks + best-fit hooks), `Openings.tsx` (best-fit setter), `CandidateProfile.tsx`/`CandidateTable.tsx` (share action + general score), `Overview.tsx`/`CandidateCard.tsx` (general score), `Index.tsx` (Ask AI tab + floating chat mount).
- Existing pipeline, onboarding, evaluation, decision, and voice-agent flows remain intact. Validation via the repo's typecheck/build/lint/tests.

## Assumptions
- All 21 offices are in Pennsylvania under the five sub-regions above (regroupable later).
- No manager names/emails were provided per office yet — the fields are ready so you can fill them in and invite managers when ready.
- royaltokens@gmail.com keeps its current admin access; the three named emails are the permanent full-access admins.