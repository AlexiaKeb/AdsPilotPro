ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill first_name/last_name from full_name when possible
UPDATE public.profiles
SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name  = COALESCE(last_name,  NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''))
WHERE full_name IS NOT NULL AND full_name <> '' AND (first_name IS NULL OR last_name IS NULL);