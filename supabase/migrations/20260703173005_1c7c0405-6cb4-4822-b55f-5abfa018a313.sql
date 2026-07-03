-- Support rich interview / phone-screen evaluation forms
ALTER TABLE public.scorecard_templates
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'scorecard';

ALTER TABLE public.candidate_evaluations
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;