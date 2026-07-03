-- Add posting URL fields to positions
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS posting_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS posting_locations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Calendar / scheduling events table
CREATE TABLE IF NOT EXISTS public.interview_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'interview',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  mode text NOT NULL DEFAULT '',
  location_detail text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_events TO authenticated;
GRANT ALL ON public.interview_events TO service_role;

ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_events_select ON public.interview_events FOR SELECT TO authenticated
  USING (public.has_all_access(auth.uid()) OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id)));
CREATE POLICY interview_events_insert ON public.interview_events FOR INSERT TO authenticated
  WITH CHECK (public.has_all_access(auth.uid()) OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id)));
CREATE POLICY interview_events_update ON public.interview_events FOR UPDATE TO authenticated
  USING (public.has_all_access(auth.uid()) OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id)))
  WITH CHECK (public.has_all_access(auth.uid()) OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id)));
CREATE POLICY interview_events_delete ON public.interview_events FOR DELETE TO authenticated
  USING (public.has_all_access(auth.uid()) OR (location_id IS NOT NULL AND public.can_access_location(auth.uid(), location_id)));

CREATE TRIGGER update_interview_events_updated_at BEFORE UPDATE ON public.interview_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();