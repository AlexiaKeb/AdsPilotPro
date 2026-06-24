ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS audits_this_month integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;