-- Profit Leak Scan : marge brute mémorisée + historique des scans.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gross_margin_pct numeric
  CHECK (gross_margin_pct IS NULL OR (gross_margin_pct > 0 AND gross_margin_pct <= 100));

-- Colonne éditable par l'utilisateur (les colonnes sensibles restent verrouillées).
GRANT UPDATE (gross_margin_pct) ON public.profiles TO authenticated;

CREATE TABLE public.leak_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_days integer NOT NULL,
  margin_pct numeric NOT NULL,
  total_spend numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  leak_total numeric NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leak_scans_user_created_idx ON public.leak_scans (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.leak_scans TO authenticated;
GRANT ALL ON public.leak_scans TO service_role;

ALTER TABLE public.leak_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own leak scans" ON public.leak_scans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leak scans" ON public.leak_scans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own leak scans" ON public.leak_scans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
