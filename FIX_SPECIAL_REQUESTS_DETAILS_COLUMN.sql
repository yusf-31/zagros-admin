-- Run this in Supabase Dashboard → SQL Editor
-- Fixes: "Could not find the 'details' column of 'special_requests' in the schema cache"
-- Use this if the table already exists but is missing the details column (or other columns).

-- 1. Create table only if it doesn't exist (with all columns the app needs)
CREATE TABLE IF NOT EXISTS public.special_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text,
  details text NOT NULL DEFAULT '',
  attachment_url text,
  whatsapp_number text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add any missing columns (safe to run multiple times)
DO $$
BEGIN
  -- Add details if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'special_requests' AND column_name = 'details') THEN
    ALTER TABLE public.special_requests ADD COLUMN details text NOT NULL DEFAULT '';
    ALTER TABLE public.special_requests ALTER COLUMN details DROP DEFAULT;
  END IF;
  -- Add whatsapp_number if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'special_requests' AND column_name = 'whatsapp_number') THEN
    ALTER TABLE public.special_requests ADD COLUMN whatsapp_number text;
  END IF;
  -- Add product_name if missing (nullable)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'special_requests' AND column_name = 'product_name') THEN
    ALTER TABLE public.special_requests ADD COLUMN product_name text;
  END IF;
  -- Ensure product_name is nullable
  BEGIN
    ALTER TABLE public.special_requests ALTER COLUMN product_name DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 3. After running: In Supabase go to Settings → API and wait a few seconds, or just retry the app.
