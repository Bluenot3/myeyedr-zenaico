CREATE TABLE public.hiring_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  golden_id uuid REFERENCES public.golden_profiles(id) ON DELETE SET NULL,
  decision text NOT NULL DEFAULT 'hold',
  power_score integer,
  fit_score integer,
  contenders jsonb NOT NULL DEFAULT '[]'::jsonb,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hiring_decisions TO authenticated;
GRANT ALL ON public.hiring_decisions TO service_role;

ALTER TABLE public.hiring_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View decisions for accessible candidates"
  ON public.hiring_decisions FOR SELECT
  TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "Record decisions for accessible candidates"
  ON public.hiring_decisions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id) AND decided_by = auth.uid());

CREATE POLICY "Update own or all-access decisions"
  ON public.hiring_decisions FOR UPDATE
  TO authenticated
  USING (decided_by = auth.uid() OR public.has_all_access(auth.uid()))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "Delete own or all-access decisions"
  ON public.hiring_decisions FOR DELETE
  TO authenticated
  USING (decided_by = auth.uid() OR public.has_all_access(auth.uid()));

CREATE TRIGGER update_hiring_decisions_updated_at
  BEFORE UPDATE ON public.hiring_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();