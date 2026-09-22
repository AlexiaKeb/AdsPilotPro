CREATE TABLE public.audit_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_shares_audit ON public.audit_shares(audit_id);
CREATE INDEX idx_audit_shares_user ON public.audit_shares(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_shares TO authenticated;
GRANT ALL ON public.audit_shares TO service_role;

ALTER TABLE public.audit_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audit shares"
ON public.audit_shares FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_audit_shares_updated_at
BEFORE UPDATE ON public.audit_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();