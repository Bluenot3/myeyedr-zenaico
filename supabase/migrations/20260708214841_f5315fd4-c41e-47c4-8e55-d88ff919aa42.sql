-- 1) Owner check
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND lower(email) IN ('royaltokens@gmail.com', 'alexander.leschik@myeyedr.com')
  );
$$;

-- 2) Tighten cross-user visibility to owners only
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_owner(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS user_locations_select ON public.user_locations;
CREATE POLICY user_locations_select ON public.user_locations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

-- 3) Job Library
CREATE TABLE public.job_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  department text NOT NULL DEFAULT '',
  employment_type text NOT NULL DEFAULT 'Full-time',
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  pay_range text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_templates TO authenticated;
GRANT ALL ON public.job_templates TO service_role;

ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_templates_select ON public.job_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY job_templates_write ON public.job_templates
  FOR ALL TO authenticated
  USING (public.has_all_access(auth.uid()))
  WITH CHECK (public.has_all_access(auth.uid()));

CREATE TRIGGER update_job_templates_updated_at
  BEFORE UPDATE ON public.job_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Allow owners/admins to delete requisitions
DROP POLICY IF EXISTS positions_delete ON public.positions;
CREATE POLICY positions_delete ON public.positions
  FOR DELETE TO authenticated
  USING (public.has_all_access(auth.uid()));
