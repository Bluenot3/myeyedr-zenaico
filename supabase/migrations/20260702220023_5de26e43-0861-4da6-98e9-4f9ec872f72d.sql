
-- ========================= Screening Agents =========================
CREATE TABLE public.screening_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_focus TEXT NOT NULL DEFAULT 'General Screening',
  persona TEXT NOT NULL DEFAULT 'warm, professional, concise',
  voice_id TEXT NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  voice_name TEXT NOT NULL DEFAULT 'Sarah',
  opening_line TEXT NOT NULL DEFAULT 'Hi, this is the MyEyeDr recruiting team calling about your application. Do you have a few minutes to chat?',
  closing_line TEXT NOT NULL DEFAULT 'Thank you so much for your time. Our team will follow up with next steps shortly.',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  extraction_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  system_prompt TEXT NOT NULL DEFAULT '',
  temperature NUMERIC NOT NULL DEFAULT 0.6,
  stability NUMERIC NOT NULL DEFAULT 0.5,
  similarity NUMERIC NOT NULL DEFAULT 0.75,
  active BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT 'emerald',
  runs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_agents TO authenticated, anon;
GRANT ALL ON public.screening_agents TO service_role;
ALTER TABLE public.screening_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to screening_agents" ON public.screening_agents FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_screening_agents_updated_at BEFORE UPDATE ON public.screening_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================= Screening Transcripts =========================
CREATE TABLE public.screening_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  agent_id UUID,
  source TEXT NOT NULL DEFAULT 'upload',
  title TEXT NOT NULL DEFAULT 'Interview Transcript',
  transcript TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  fit_score INTEGER,
  recommendation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_transcripts TO authenticated, anon;
GRANT ALL ON public.screening_transcripts TO service_role;
ALTER TABLE public.screening_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to screening_transcripts" ON public.screening_transcripts FOR ALL USING (true) WITH CHECK (true);

-- ========================= Candidate Scorecards =========================
CREATE TABLE public.candidate_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_score INTEGER NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  concerns JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT 'pending',
  evaluated_by TEXT NOT NULL DEFAULT 'Administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_scorecards TO authenticated, anon;
GRANT ALL ON public.candidate_scorecards TO service_role;
ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidate_scorecards" ON public.candidate_scorecards FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_candidate_scorecards_updated_at BEFORE UPDATE ON public.candidate_scorecards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
