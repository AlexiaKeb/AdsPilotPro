ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS audits_user_created_idx ON public.audits (user_id, created_at DESC);