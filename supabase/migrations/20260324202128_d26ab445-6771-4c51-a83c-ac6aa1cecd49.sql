
-- Create locations table for admin-editable site directory
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  site_name TEXT NOT NULL,
  manager TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(region, site_name)
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);

-- Seed current locations (removing the ones user wants removed)
INSERT INTO public.locations (region, site_name) VALUES
  ('DC', 'FBR Club'),
  ('DC', 'George M. Ferris Clubhouse #6'),
  ('DC', 'Richard England Clubhouse #14'),
  ('DC', 'Jelleff Community Center'),
  ('Maryland', 'Germantown Elementary School'),
  ('Virginia', 'Dunbar Alexandria Olympic Club'),
  ('Virginia', 'Bailey''s Boys & Girls Club'),
  ('Virginia', 'Murraygate Village Club'),
  ('Virginia', 'Hylton Club'),
  ('Virginia', 'Martin K. Alloy Club'),
  ('Virginia', 'Heiser Club'),
  ('Virginia', 'Ox-Hill Club'),
  ('Virginia', 'Annandale Club'),
  ('Virtual', 'Clubhouse @ Your House');
