-- 1. Locations: street address + manager email
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS manager_email text;

-- 2. Cross-location candidate sharing
CREATE TABLE IF NOT EXISTS public.candidate_location_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, location_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_location_shares TO authenticated;
GRANT ALL ON public.candidate_location_shares TO service_role;

ALTER TABLE public.candidate_location_shares ENABLE ROW LEVEL SECURITY;

-- Anyone who can access the candidate may view its shares
CREATE POLICY "shares_select" ON public.candidate_location_shares
  FOR SELECT TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

-- Users who can access a candidate may share it to another location
CREATE POLICY "shares_insert" ON public.candidate_location_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_candidate(auth.uid(), candidate_id));

CREATE POLICY "shares_delete" ON public.candidate_location_shares
  FOR DELETE TO authenticated
  USING (public.can_access_candidate(auth.uid(), candidate_id));

-- 3. Extend candidate access to include shared locations
CREATE OR REPLACE FUNCTION public.can_access_candidate(_user_id uuid, _candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_all_access(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.user_locations ul ON ul.location_id = c.location_id
      WHERE c.id = _candidate_id AND ul.user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.candidate_location_shares s
      JOIN public.user_locations ul ON ul.location_id = s.location_id
      WHERE s.candidate_id = _candidate_id AND ul.user_id = _user_id);
$function$;

-- 4. Permanent admin emails on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, must_reset_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'must_reset_password')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) IN (
    'royaltokens@gmail.com',
    'alexander.leschik@myeyedr.com',
    'rebecca.cochran@myeyedr.com',
    'kimberly.avanzato@myeyedr.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;