-- ============ Scorecard templates (position-specific, editable, duplicable) ============
CREATE TABLE public.scorecard_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  competencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_templates TO authenticated;
GRANT ALL ON public.scorecard_templates TO service_role;

ALTER TABLE public.scorecard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY scorecard_templates_select ON public.scorecard_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY scorecard_templates_write ON public.scorecard_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_scorecard_templates_updated
  BEFORE UPDATE ON public.scorecard_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Candidate evaluations (filled scorecards, multi-evaluator) ============
CREATE TABLE public.candidate_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.scorecard_templates(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.interview_events(id) ON DELETE SET NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  template_name text NOT NULL DEFAULT '',
  evaluator text NOT NULL DEFAULT '',
  ratings jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_score integer NOT NULL DEFAULT 0,
  recommendation text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_evaluations TO authenticated;
GRANT ALL ON public.candidate_evaluations TO service_role;

ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidate_evaluations_all ON public.candidate_evaluations
  FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE TRIGGER trg_candidate_evaluations_updated
  BEFORE UPDATE ON public.candidate_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();