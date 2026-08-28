-- Keep every job-specific application visible to the users responsible for
-- that office. Admins and regional users retain their existing all-access path.
CREATE OR REPLACE FUNCTION public.can_access_candidate(_user_id uuid, _candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_all_access(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.candidates c
      JOIN public.user_locations ul ON ul.location_id = c.location_id
      WHERE c.id = _candidate_id AND ul.user_id = _user_id)
    OR EXISTS (
      SELECT 1
      FROM public.candidate_requisitions cr
      JOIN public.user_locations ul ON ul.location_id = cr.location_id
      WHERE cr.candidate_id = _candidate_id AND ul.user_id = _user_id)
    OR EXISTS (
      SELECT 1
      FROM public.candidate_location_shares s
      JOIN public.user_locations ul ON ul.location_id = s.location_id
      WHERE s.candidate_id = _candidate_id AND ul.user_id = _user_id);
$function$;

DROP POLICY IF EXISTS "candidates_select" ON public.candidates;
CREATE POLICY "candidates_select" ON public.candidates
  FOR SELECT TO authenticated
  USING (public.can_access_candidate(auth.uid(), id));

DROP POLICY IF EXISTS "candidates_update" ON public.candidates;
CREATE POLICY "candidates_update" ON public.candidates
  FOR UPDATE TO authenticated
  USING (public.can_access_candidate(auth.uid(), id))
  WITH CHECK (public.can_access_candidate(auth.uid(), id));

DROP POLICY IF EXISTS "candidates_delete" ON public.candidates;
CREATE POLICY "candidates_delete" ON public.candidates
  FOR DELETE TO authenticated
  USING (public.can_access_candidate(auth.uid(), id));

-- Preserve pre-requisition candidates in the job-specific application model.
INSERT INTO public.candidate_requisitions (
  candidate_id,
  position_id,
  location_id,
  stage,
  status,
  source,
  is_primary,
  created_by,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.position_id,
  c.location_id,
  c.stage,
  c.status,
  c.source,
  NOT EXISTS (
    SELECT 1
    FROM public.candidate_requisitions existing_primary
    WHERE existing_primary.candidate_id = c.id
      AND existing_primary.is_primary
  ),
  'legacy-backfill',
  c.created_at,
  c.updated_at
FROM public.candidates c
WHERE c.position_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.candidate_requisitions cr
    WHERE cr.candidate_id = c.id
      AND cr.position_id = c.position_id
  );

-- The public intake and internal assignment flows are idempotent per job.
CREATE UNIQUE INDEX IF NOT EXISTS candidate_requisitions_candidate_position_key
  ON public.candidate_requisitions (candidate_id, position_id)
  WHERE position_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_requisitions_location_candidate
  ON public.candidate_requisitions (location_id, candidate_id)
  WHERE location_id IS NOT NULL;
