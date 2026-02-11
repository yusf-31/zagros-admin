-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates the settings table and CBM price support for the admin panel + app
--
-- Prerequisite: Your project must already have app_role enum and has_role() (from your auth setup).
-- If you get "type app_role does not exist", run your earliest migrations first.

-- 1. Create settings table (skip if already exists)
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop any old policies (in case they exist from previous migrations)
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.settings;
DROP POLICY IF EXISTS "Admins can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;

-- 4. Policies: only admins can read/update/insert (admin panel uses admin user)
CREATE POLICY "Admins can view settings"
  ON public.settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
  ON public.settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Function for the app to read CBM price (public, no auth required)
CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _value text;
BEGIN
  IF _key NOT IN ('cbm_price', 'air_price_per_kg', 'exchange_rate', 'rmb_exchange_rate') THEN
    RETURN NULL;
  END IF;
  SELECT value INTO _value FROM public.settings WHERE key = _key;
  RETURN _value;
END;
$$;

-- 6. Default CBM price (only if no row exists)
INSERT INTO public.settings (key, value)
VALUES ('cbm_price', '100')
ON CONFLICT (key) DO NOTHING;
