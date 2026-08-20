ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS notion_page_id text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS notion_page_id text;
CREATE UNIQUE INDEX IF NOT EXISTS candidates_notion_page_id_key ON public.candidates (notion_page_id) WHERE notion_page_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS positions_notion_page_id_key ON public.positions (notion_page_id) WHERE notion_page_id IS NOT NULL;

CREATE TABLE public.notion_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL UNIQUE,
  database_id text NOT NULL,
  database_title text NOT NULL DEFAULT '',
  field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notion_sync_settings TO authenticated;
GRANT ALL ON public.notion_sync_settings TO service_role;
ALTER TABLE public.notion_sync_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notion sync settings" ON public.notion_sync_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_notion_sync_settings_updated_at BEFORE UPDATE ON public.notion_sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notion_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text NOT NULL DEFAULT '',
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notion_sync_runs TO authenticated;
GRANT ALL ON public.notion_sync_runs TO service_role;
ALTER TABLE public.notion_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notion sync runs" ON public.notion_sync_runs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.login_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.login_briefs TO authenticated;
GRANT ALL ON public.login_briefs TO service_role;
ALTER TABLE public.login_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own brief" ON public.login_briefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());