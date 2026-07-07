-- Onboarding checklist for hired candidates
CREATE TABLE public.candidate_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress',            -- in_progress | complete | paused
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,              -- [{key,label,group,status,date,notes}]
  first_day_date date,
  first_day_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  first_day_time text NOT NULL DEFAULT '',
  trainer_name text NOT NULL DEFAULT '',
  training_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{week,focus,trainer,activities,location}]
  offer_details jsonb NOT NULL DEFAULT '{}'::jsonb,      -- {salary,counter,counter_notes,...}
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_onboarding TO authenticated;
GRANT ALL ON public.candidate_onboarding TO service_role;

ALTER TABLE public.candidate_onboarding ENABLE ROW LEVEL SECURITY;

-- Location-scoped access, mirroring candidates: admins/regionals see all,
-- managers see onboarding for candidates at their assigned locations.
CREATE POLICY "onboarding_select" ON public.candidate_onboarding
  FOR SELECT TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "onboarding_insert" ON public.candidate_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "onboarding_update" ON public.candidate_onboarding
  FOR UPDATE TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "onboarding_delete" ON public.candidate_onboarding
  FOR DELETE TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

CREATE TRIGGER update_candidate_onboarding_updated_at
  BEFORE UPDATE ON public.candidate_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();