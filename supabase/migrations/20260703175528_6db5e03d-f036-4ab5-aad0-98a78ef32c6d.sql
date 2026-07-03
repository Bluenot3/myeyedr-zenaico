CREATE TABLE public.candidate_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  risk_level text NOT NULL DEFAULT 'unknown',
  headline text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NOT NULL DEFAULT '',
  generated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_signals TO authenticated;
GRANT ALL ON public.candidate_signals TO service_role;

ALTER TABLE public.candidate_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signals access by candidate scope"
  ON public.candidate_signals FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE TRIGGER trg_candidate_signals_updated
  BEFORE UPDATE ON public.candidate_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();