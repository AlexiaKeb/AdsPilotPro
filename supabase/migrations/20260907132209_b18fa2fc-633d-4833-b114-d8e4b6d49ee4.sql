CREATE TABLE public.action_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'andromeda',
  title TEXT NOT NULL,
  detail TEXT,
  impact TEXT NOT NULL DEFAULT 'moyen',
  horizon TEXT NOT NULL DEFAULT '7 jours',
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_tasks TO authenticated;
GRANT ALL ON public.action_tasks TO service_role;

ALTER TABLE public.action_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own action tasks" ON public.action_tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_action_tasks_updated_at
  BEFORE UPDATE ON public.action_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX action_tasks_user_done_idx ON public.action_tasks (user_id, done, created_at DESC);