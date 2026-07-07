-- =========================================================
-- Requisitions, candidate applications, history + richer parse fields
-- =========================================================

-- 1) Extend positions into requisitions
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS req_code text,
  ADD COLUMN IF NOT EXISTS hiring_manager text NOT NULL DEFAULT '';

-- Sequence + trigger to mint human requisition codes like REQ-0007
CREATE SEQUENCE IF NOT EXISTS public.requisition_code_seq START 1;

CREATE OR REPLACE FUNCTION public.set_requisition_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.req_code IS NULL OR NEW.req_code = '' THEN
    NEW.req_code := 'REQ-' || lpad(nextval('public.requisition_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS positions_set_req_code ON public.positions;
CREATE TRIGGER positions_set_req_code
  BEFORE INSERT ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_requisition_code();

-- Backfill existing positions with req codes
UPDATE public.positions
SET req_code = 'REQ-' || lpad(nextval('public.requisition_code_seq')::text, 4, '0')
WHERE req_code IS NULL OR req_code = '';

-- 2) Extend candidates with richer parsed data + status fields
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_employer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resume_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resume_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS parse_confidence numeric,
  ADD COLUMN IF NOT EXISTS screening_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS interview_status text NOT NULL DEFAULT 'not_started';

-- 3) candidate_requisitions (applications: candidate <-> requisition over time)
CREATE TABLE IF NOT EXISTS public.candidate_requisitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'applied',
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_requisitions TO authenticated;
GRANT ALL ON public.candidate_requisitions TO service_role;
ALTER TABLE public.candidate_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidate_requisitions_all"
  ON public.candidate_requisitions FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE TRIGGER update_candidate_requisitions_updated_at
  BEFORE UPDATE ON public.candidate_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_candidate_requisitions_candidate ON public.candidate_requisitions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_requisitions_position ON public.candidate_requisitions(position_id);

-- 4) candidate_events (durable activity timeline)
CREATE TABLE IF NOT EXISTS public.candidate_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  requisition_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  actor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_events TO authenticated;
GRANT ALL ON public.candidate_events TO service_role;
ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidate_events_all"
  ON public.candidate_events FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE INDEX IF NOT EXISTS idx_candidate_events_candidate ON public.candidate_events(candidate_id);

-- 5) Tie screenings/interviews explicitly to a requisition
ALTER TABLE public.interview_events
  ADD COLUMN IF NOT EXISTS requisition_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

ALTER TABLE public.candidate_evaluations
  ADD COLUMN IF NOT EXISTS requisition_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;