-- ============ ROLES & PROFILES ============
CREATE TYPE public.app_role AS ENUM ('admin','regional','manager');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  must_reset_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);
GRANT SELECT ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.has_all_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','regional'));
$$;

CREATE OR REPLACE FUNCTION public.can_access_location(_user_id uuid, _location_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_all_access(_user_id)
    OR (_location_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_locations WHERE user_id = _user_id AND location_id = _location_id));
$$;

CREATE OR REPLACE FUNCTION public.can_access_candidate(_user_id uuid, _candidate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_all_access(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.user_locations ul ON ul.location_id = c.location_id
      WHERE c.id = _candidate_id AND ul.user_id = _user_id);
$$;

-- ============ NEW USER TRIGGER (profile + bootstrap admins) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, must_reset_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'must_reset_password')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) IN ('royaltokens@gmail.com','alexander.leschik@myeyedr.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS: profiles / user_roles / user_locations ============
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_locations_select" ON public.user_locations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ REPLACE PUBLIC POLICIES ON RECRUITING TABLES ============
-- candidates
DROP POLICY "Allow all access to candidates" ON public.candidates;
REVOKE ALL ON public.candidates FROM anon;
CREATE POLICY "candidates_select" ON public.candidates FOR SELECT TO authenticated
  USING (public.can_access_location(auth.uid(), location_id));
CREATE POLICY "candidates_insert" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.can_access_location(auth.uid(), location_id));
CREATE POLICY "candidates_update" ON public.candidates FOR UPDATE TO authenticated
  USING (public.can_access_location(auth.uid(), location_id))
  WITH CHECK (public.can_access_location(auth.uid(), location_id));
CREATE POLICY "candidates_delete" ON public.candidates FOR DELETE TO authenticated
  USING (public.can_access_location(auth.uid(), location_id));

-- locations
DROP POLICY "Allow all access to locations" ON public.locations;
REVOKE ALL ON public.locations FROM anon;
CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated
  USING (public.can_access_location(auth.uid(), id));
CREATE POLICY "locations_write" ON public.locations FOR ALL TO authenticated
  USING (public.has_all_access(auth.uid())) WITH CHECK (public.has_all_access(auth.uid()));

-- positions (readable by all authenticated; writable by all-access)
DROP POLICY "Allow all access to positions" ON public.positions;
REVOKE ALL ON public.positions FROM anon;
CREATE POLICY "positions_select" ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "positions_write" ON public.positions FOR ALL TO authenticated
  USING (public.has_all_access(auth.uid())) WITH CHECK (public.has_all_access(auth.uid()));

-- candidate child tables scoped by candidate access
DROP POLICY "Allow all access to candidate_badges" ON public.candidate_badges;
REVOKE ALL ON public.candidate_badges FROM anon;
CREATE POLICY "candidate_badges_all" ON public.candidate_badges FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

DROP POLICY "Allow all access to candidate_notes" ON public.candidate_notes;
REVOKE ALL ON public.candidate_notes FROM anon;
CREATE POLICY "candidate_notes_all" ON public.candidate_notes FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

DROP POLICY "Allow all access to candidate_scorecards" ON public.candidate_scorecards;
REVOKE ALL ON public.candidate_scorecards FROM anon;
CREATE POLICY "candidate_scorecards_all" ON public.candidate_scorecards FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

DROP POLICY "Allow all access to contact_log" ON public.contact_log;
REVOKE ALL ON public.contact_log FROM anon;
CREATE POLICY "contact_log_all" ON public.contact_log FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

DROP POLICY "Allow all access to screening_transcripts" ON public.screening_transcripts;
REVOKE ALL ON public.screening_transcripts FROM anon;
CREATE POLICY "screening_transcripts_all" ON public.screening_transcripts FOR ALL TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id))
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

-- library tables: read by all authenticated, write by all-access
DROP POLICY "Allow all access to interview_questions" ON public.interview_questions;
REVOKE ALL ON public.interview_questions FROM anon;
CREATE POLICY "interview_questions_select" ON public.interview_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "interview_questions_write" ON public.interview_questions FOR ALL TO authenticated
  USING (public.has_all_access(auth.uid())) WITH CHECK (public.has_all_access(auth.uid()));

DROP POLICY "Allow all access to screening_templates" ON public.screening_templates;
REVOKE ALL ON public.screening_templates FROM anon;
CREATE POLICY "screening_templates_select" ON public.screening_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "screening_templates_write" ON public.screening_templates FOR ALL TO authenticated
  USING (public.has_all_access(auth.uid())) WITH CHECK (public.has_all_access(auth.uid()));

-- screening_agents: ADMIN ONLY (AI)
DROP POLICY "Allow all access to screening_agents" ON public.screening_agents;
REVOKE ALL ON public.screening_agents FROM anon;
CREATE POLICY "screening_agents_admin" ON public.screening_agents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));