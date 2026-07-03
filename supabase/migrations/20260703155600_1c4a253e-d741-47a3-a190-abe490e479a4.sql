-- Add job title to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title text;

-- Scope job openings to a user's locations (admins/regionals see all)
DROP POLICY IF EXISTS positions_select ON public.positions;
CREATE POLICY positions_select ON public.positions
  FOR SELECT
  USING (
    public.has_all_access(auth.uid())
    OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id))
  );