-- ============================================================================
-- SÉCURITÉ : empêcher un utilisateur de modifier son plan / ses quotas.
--
-- Avant : le GRANT UPDATE portait sur toute la table `profiles` et la policy RLS
-- ne vérifiait que `has_andromeda_access`. Un utilisateur pouvait donc exécuter
-- `supabase.from('profiles').update({ plan: 'pro' })` depuis son navigateur.
--
-- Maintenant : l'UPDATE côté client est limité aux colonnes "profil" ci-dessous.
-- `plan`, `plan_expires_at`, compteurs d'usage, `email`, `has_andromeda_access`
-- ne sont modifiables que par le service role (serveur / webhooks de paiement)
-- ou par des fonctions SECURITY DEFINER.
-- ============================================================================

REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (
  first_name,
  last_name,
  full_name,
  sector,
  country,
  timezone,
  avatar_url,
  onboarding_completed,
  onboarding_answers
) ON public.profiles TO authenticated;

-- L'INSERT client n'a pas d'utilité (le profil est créé par le trigger
-- handle_new_user) et permettrait de choisir `plan` à la création.
REVOKE INSERT, DELETE ON public.profiles FROM authenticated, anon;

-- ============================================================================
-- CRÉDITS IA
-- 1. `onboarding` : le diagnostic de bienvenue n'est plus décompté du quota.
-- 2. `refund_ai_credit` : rend le crédit si l'appel IA échoue (service role only,
--    sinon un utilisateur pourrait décrémenter son propre compteur).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_ai_credit(_kind text DEFAULT 'audit'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _plan text;
  _used integer;
  _start date;
  _limit integer;
  _month date := date_trunc('month', now())::date;
  _required text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT plan, ai_calls_this_month, usage_period_start
    INTO _plan, _used, _start
  FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF _start IS DISTINCT FROM _month THEN
    _used := 0;
    UPDATE public.profiles
      SET ai_calls_this_month = 0, usage_period_start = _month
      WHERE id = _uid;
  END IF;

  _plan := coalesce(_plan, 'free');

  -- Diagnostic d'accueil : offert, non décompté.
  IF _kind = 'onboarding' THEN
    RETURN jsonb_build_object('allowed', true, 'plan', _plan, 'used', _used, 'counted', false);
  END IF;

  _required := CASE _kind
    WHEN 'creative' THEN 'pro'
    WHEN 'oracle' THEN 'starter'
    WHEN 'mercury' THEN 'starter'
    WHEN 'atlas' THEN 'starter'
    ELSE 'free'
  END;

  IF _required = 'pro' AND _plan <> 'pro' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_required', 'plan', _plan, 'required_plan', 'pro');
  END IF;

  IF _required = 'starter' AND _plan NOT IN ('starter', 'pro') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_required', 'plan', _plan, 'required_plan', 'starter');
  END IF;

  _limit := CASE _plan WHEN 'pro' THEN NULL WHEN 'starter' THEN 5 ELSE 3 END;

  IF _limit IS NOT NULL AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'plan', _plan, 'limit', _limit, 'used', _used);
  END IF;

  UPDATE public.profiles
    SET ai_calls_this_month = ai_calls_this_month + 1
    WHERE id = _uid;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', _plan,
    'used', _used + 1,
    'limit', _limit,
    'remaining', CASE WHEN _limit IS NULL THEN NULL ELSE _limit - (_used + 1) END,
    'counted', true
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_credit(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.refund_ai_credit(_uid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET ai_calls_this_month = greatest(0, ai_calls_this_month - 1)
   WHERE id = _uid;
$$;

REVOKE ALL ON FUNCTION public.refund_ai_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credit(uuid) TO service_role;

-- ============================================================================
-- RGPD : la connexion Meta (token d'accès) doit disparaître avec le compte.
-- On purge d'abord les éventuelles lignes orphelines, puis on ajoute la FK.
-- ============================================================================

DELETE FROM public.meta_connections mc
 WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = mc.user_id);

ALTER TABLE public.meta_connections
  ADD CONSTRAINT meta_connections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
