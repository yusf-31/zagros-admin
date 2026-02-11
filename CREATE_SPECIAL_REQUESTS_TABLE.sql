-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates the special_requests table so the app and admin panel can add/view/update requests.
--
-- Prerequisite: Your project must have app_role enum and has_role() (from your auth setup).

-- 1. Helper function for updated_at (skip if you already have it)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Create special_requests table (skip if already exists)
CREATE TABLE IF NOT EXISTS public.special_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text,
  details text NOT NULL,
  attachment_url text,
  whatsapp_number text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add whatsapp_number if table existed from an older migration without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'special_requests' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE public.special_requests ADD COLUMN whatsapp_number text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'special_requests' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.special_requests ALTER COLUMN product_name DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Enable RLS
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own requests" ON public.special_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.special_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.special_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.special_requests;

-- 6. Users can see their own requests (app: My Requests)
CREATE POLICY "Users can view own requests"
  ON public.special_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Users can create requests (app: Add Special Request)
CREATE POLICY "Users can create requests"
  ON public.special_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Admins can see all requests (admin panel: Special Requests page)
CREATE POLICY "Admins can view all requests"
  ON public.special_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Admins can update requests (admin panel: reply, status)
CREATE POLICY "Admins can update requests"
  ON public.special_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS update_special_requests_updated_at ON public.special_requests;
CREATE TRIGGER update_special_requests_updated_at
  BEFORE UPDATE ON public.special_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: storage bucket for request attachments (run once; ignore "already exists" error)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', true);
