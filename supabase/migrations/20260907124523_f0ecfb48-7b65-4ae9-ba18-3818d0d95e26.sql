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

  -- Plan minimum requis par module
  _required := CASE _kind
    WHEN 'creative' THEN 'pro'
    WHEN 'oracle' THEN 'starter'
    WHEN 'mercury' THEN 'starter'
    WHEN 'atlas' THEN 'starter'
    ELSE 'free'   -- andromeda, simulateur, audit (legacy)
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
    'remaining', CASE WHEN _limit IS NULL THEN NULL ELSE _limit - (_used + 1) END
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_credit(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text) TO authenticated;