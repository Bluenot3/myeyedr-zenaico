CREATE TABLE public.golden_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid REFERENCES public.positions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT 'Ideal Candidate',
  source text NOT NULL DEFAULT 'generated',
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  summary text NOT NULL DEFAULT '',
  ideal_years_experience numeric NOT NULL DEFAULT 0,
  must_have_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  nice_to_have_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume_text text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT 'Administrator',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.golden_profiles TO authenticated;
GRANT ALL ON public.golden_profiles TO service_role;

ALTER TABLE public.golden_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view golden profiles"
  ON public.golden_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create golden profiles"
  ON public.golden_profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update golden profiles"
  ON public.golden_profiles FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete golden profiles"
  ON public.golden_profiles FOR DELETE TO authenticated
  USING (true);

CREATE TRIGGER update_golden_profiles_updated_at
  BEFORE UPDATE ON public.golden_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();