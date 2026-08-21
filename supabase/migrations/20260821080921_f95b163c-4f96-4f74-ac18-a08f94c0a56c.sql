ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_calls_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_period_start date NOT NULL DEFAULT date_trunc('month', now())::date;

CREATE OR REPLACE FUNCTION public.consume_ai_credit(_kind text DEFAULT 'audit')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text;
  _used integer;
  _start date;
  _limit integer;
  _month date := date_trunc('month', now())::date;
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

  -- Analyse créative : réservée au plan Pro
  IF _kind = 'creative' AND _plan <> 'pro' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_required', 'plan', _plan, 'required_plan', 'pro');
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
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text) TO authenticated;