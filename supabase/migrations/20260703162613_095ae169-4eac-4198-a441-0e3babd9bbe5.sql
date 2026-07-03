CREATE TABLE public.candidate_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'audio',
  content_type text,
  size bigint NOT NULL DEFAULT 0,
  label text,
  duration_seconds numeric,
  status text NOT NULL DEFAULT 'ready',
  transcript text,
  words jsonb NOT NULL DEFAULT '[]'::jsonb,
  soundbites jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  sentiment text,
  recommendation text,
  fit_score numeric,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_media TO authenticated;
GRANT ALL ON public.candidate_media TO service_role;

ALTER TABLE public.candidate_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidate_media_select ON public.candidate_media
  FOR SELECT TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY candidate_media_insert ON public.candidate_media
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY candidate_media_update ON public.candidate_media
  FOR UPDATE TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY candidate_media_delete ON public.candidate_media
  FOR DELETE TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

CREATE TRIGGER update_candidate_media_updated_at
  BEFORE UPDATE ON public.candidate_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_candidate_media_candidate ON public.candidate_media(candidate_id);