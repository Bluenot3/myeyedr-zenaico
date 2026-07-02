
-- ============================================================
-- MyEyeDr Recruiting Command Center — schema rebuild
-- ============================================================

-- Repurpose locations for MyEyeDr offices
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

-- Drop old onboarding-oriented candidate tables (product pivot to recruiting)
DROP TABLE IF EXISTS public.candidate_documents CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;

-- ---------- Positions (open roles) ----------
CREATE TABLE public.positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  region text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  employment_type text NOT NULL DEFAULT 'Full-time',
  openings integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  pay_range text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated, anon;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to positions" ON public.positions FOR ALL USING (true) WITH CHECK (true);

-- ---------- Candidates (applicants) ----------
CREATE TABLE public.candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  applied_role text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'applied',
  status text NOT NULL DEFAULT 'active',
  score integer NOT NULL DEFAULT 0,
  rating integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT '',
  resume_url text NOT NULL DEFAULT '',
  in_talent_pool boolean NOT NULL DEFAULT false,
  talent_pool_reason text NOT NULL DEFAULT '',
  best_fit_roles text NOT NULL DEFAULT '',
  last_contacted_at timestamptz,
  last_contacted_by text NOT NULL DEFAULT '',
  contact_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  headline text NOT NULL DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated, anon;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);

-- ---------- Candidate badges (blockchain-like ledger) ----------
CREATE TABLE public.candidate_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  badge_type text NOT NULL DEFAULT 'evaluation',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  block_index integer NOT NULL DEFAULT 1,
  hash text NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 40),
  prev_hash text NOT NULL DEFAULT '0000000000000000000000000000000000000000',
  score integer,
  summary text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text NOT NULL DEFAULT '',
  issued_by text NOT NULL DEFAULT 'Administrator',
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_badges TO authenticated, anon;
GRANT ALL ON public.candidate_badges TO service_role;
ALTER TABLE public.candidate_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidate_badges" ON public.candidate_badges FOR ALL USING (true) WITH CHECK (true);

-- ---------- Contact log ----------
CREATE TABLE public.contact_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'email',
  direction text NOT NULL DEFAULT 'outbound',
  contacted_by text NOT NULL DEFAULT 'Administrator',
  outcome text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_log TO authenticated, anon;
GRANT ALL ON public.contact_log TO service_role;
ALTER TABLE public.contact_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contact_log" ON public.contact_log FOR ALL USING (true) WITH CHECK (true);

-- ---------- Candidate notes ----------
CREATE TABLE public.candidate_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT 'Administrator',
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_notes TO authenticated, anon;
GRANT ALL ON public.candidate_notes TO service_role;
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidate_notes" ON public.candidate_notes FOR ALL USING (true) WITH CHECK (true);

-- ---------- Screening templates ----------
CREATE TABLE public.screening_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_templates TO authenticated, anon;
GRANT ALL ON public.screening_templates TO service_role;
ALTER TABLE public.screening_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to screening_templates" ON public.screening_templates FOR ALL USING (true) WITH CHECK (true);

-- ---------- Interview question bank ----------
CREATE TABLE public.interview_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  role text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'standard',
  guidance text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_questions TO authenticated, anon;
GRANT ALL ON public.interview_questions TO service_role;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to interview_questions" ON public.interview_questions FOR ALL USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_screening_templates_updated_at BEFORE UPDATE ON public.screening_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
