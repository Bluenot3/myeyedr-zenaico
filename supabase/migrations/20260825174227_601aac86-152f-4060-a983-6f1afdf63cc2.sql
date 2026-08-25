CREATE TABLE public.assistant_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'daily',
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  runs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_tasks TO authenticated;
GRANT ALL ON public.assistant_tasks TO service_role;
ALTER TABLE public.assistant_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own assistant tasks" ON public.assistant_tasks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.assistant_task_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.assistant_tasks ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'complete',
  result TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_task_runs TO authenticated;
GRANT ALL ON public.assistant_task_runs TO service_role;
ALTER TABLE public.assistant_task_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own assistant task runs" ON public.assistant_task_runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX assistant_tasks_due_idx ON public.assistant_tasks (user_id, active, next_run_at);
CREATE INDEX assistant_task_runs_task_idx ON public.assistant_task_runs (task_id, created_at DESC);

CREATE TRIGGER update_assistant_tasks_updated_at BEFORE UPDATE ON public.assistant_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();