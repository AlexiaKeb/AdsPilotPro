CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  ad_account_id text,
  ad_account_name text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tokens are secrets: no anon/authenticated access at all.
-- All reads/writes go through server functions using the service role
-- after verifying the signed-in user.
GRANT ALL ON public.meta_connections TO service_role;

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => table is fully locked from the Data API.

CREATE TRIGGER update_meta_connections_updated_at
BEFORE UPDATE ON public.meta_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();