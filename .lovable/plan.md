# Candidate Command — Stability, Invites, Insights & Job Library

## 1. Stop the random "reset to dashboard" reloads

Root cause: on every background token refresh, `useAuth` flips global `loading` true, which makes `Protected` swap `<Index/>` for the full-screen loader and remount it — wiping the in-memory active tab back to Overview.

- **`src/hooks/useAuth.tsx`** — Only show the blocking loader on the very first load. Track an `initialized` ref; on later `onAuthStateChange` events (TOKEN_REFRESHED / focus re-auth) update the session and refresh context silently in the background without toggling `loading`. Never let a token refresh unmount the app.
- **`src/pages/Index.tsx`** — Persist the active tab in `localStorage` (and reflect it in the URL hash) so a genuine refresh restores the last section instead of jumping to Overview.
- **`src/App.tsx`** — Give React Query stable defaults (`staleTime`, `refetchOnWindowFocus: false`, one retry) to stop refetch flicker when switching windows/tabs.

## 2. Emailed user invites (link + temp-password fallback) — owner only

- Configure the shared email domain on the existing custom domain, set up email infrastructure, and scaffold a branded transactional invite email.
- **`admin-users` edge function** — In `invite`, after creating the account also generate a secure set-password link and send the branded invite email to the new user. Still return the temp password so the existing credential dialog remains a fallback if the email bounces.
- Add a "Resend invite" action per user in `UsersManager`.

## 3. Owner-only access to Team & Access + sensitive data

Only `royaltokens@gmail.com` and `alexander.leschik@myeyedr.com` may see/manage users.

- **Migration** — add `public.is_owner(uuid)` (checks those two emails via profiles), and tighten cross-user read policies on `profiles`, `user_roles`, `user_locations` from `is_admin` → `is_owner` (each user still sees their own row).
- **`admin-users` edge function** — require `is_owner` (not just admin) for list/invite/reset/set_role/assign_locations/delete.
- **`useAuth`** expose `isOwner`; **`Index.tsx`** gate the Team & Access tab to `isOwner`. Other admins keep AI/decision tools but can't browse users.

## 4. Onboarding → hiring-manager coverage & training checklist

Offer letters, background check, drug screen, I-9, W-4, direct deposit, and benefits are handled in other systems — remove them.

- **`src/lib/onboarding.ts`** — replace `defaultOnboardingSteps`/`ONBOARDING_GROUPS` with a focused checklist so the manager can concentrate on training, grouped as:
  - **Coverage** — trainer assigned, floor coverage arranged so the trainer is freed up, backup trainer named.
  - **Schedule & Space** — first day/time set, first-week schedule shared, workspace ready.
  - **Access & Tools** — logins/credentials requested, systems access confirmed, badge/keys, uniform.
  - **Day One** — welcome & team intros, training plan reviewed with new hire.
- Keep the 4-week training plan. `OnboardingTracker` already renders from these constants, so it updates automatically. Add a small "Switch to new checklist" action for any onboarding record still holding the legacy steps.

## 5. Metrics & Insights dashboard (Admins & Regionals)

New **Insights** tab (recharts, already installed) built entirely from existing data — no heavy new tables:

- **Time to hire** — average days applied→hired, trend over recent months.
- **Pipeline conversion funnel** — stage-to-stage drop-off and overall applied→hired rate.
- **Source effectiveness** — candidates vs. hires by source, with a "best ROI source" callout.
- **Candidate volume trend** — applications per week/month.
- **What standout candidates say** — aggregate soundbite labels and most-common phrases from the transcripts/soundbites of hired & top-rated candidates ("top candidates tend to mention…"), surfaced as chips + a bar chart.
- Gated to `hasAllAccess`; read-only, so it can't break existing flows.

## 6. Reusable Job Library + full requisition control

- **Migration** — new `public.job_templates` (title, department, employment_type, description, requirements, pay_range, tags, created_by) with GRANTs; managed by `has_all_access`, readable by authenticated. Add owner/admin delete policy on `positions` so requisitions can be fully removed.
- **`parse-job` edge function** — accepts pasted text or extracted PDF text and uses Lovable AI to return structured job fields (modeled on `parse-resume`).
- **New "Jobs" tab (Admin/Regional)** — Job Library: add a job by **uploading a PDF** or **pasting text** (auto-filled via `parse-job`) or manually; edit/delete; and **"Create requisition"** from a job → prefilled New Opening where you pick office(s), openings, and status (including historical `closed`/`filled` records).
- **`Openings.tsx`** — full edit dialog (title, office, openings, priority, pay, status, description, requirements) so admins can open/close/edit **any** requisition regardless of location or stage, plus delete for record cleanup and a status filter that includes archived/closed for record-keeping.

## 7. Verify the transcriber

- Confirm the ElevenLabs connector key path in `analyze-interview` works end-to-end (Scribe v2 with v1 fallback), check edge logs, and improve the surfaced error text so failures are actionable. No behavior change unless a real bug is found.

## Technical notes
- New tables (`job_templates`) follow the CREATE→GRANT→RLS→POLICY order; `is_owner` is `SECURITY DEFINER` with fixed `search_path`.
- Email sending depends on DNS verification for the domain; invites still produce a shareable temp password immediately even while DNS finishes.
- Pipeline `CandidateCard` layout stays untouched, per earlier direction.

```text
Sidebar (owner)     Sidebar (admin/regional)
overview            overview
pipeline            pipeline
openings            openings
jobs (library)      jobs (library, regional+)
calendar            calendar
insights            insights (regional+)
pool                pool
ask ai / agents     ask ai / agents (admin)
decision            decision (admin)
library / locations library / locations
team & access       — (hidden)
```