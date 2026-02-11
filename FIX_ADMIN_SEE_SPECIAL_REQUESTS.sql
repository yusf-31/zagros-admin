-- Run in Supabase Dashboard → SQL Editor
-- Ensures admins can see all rows in special_requests (fix "don't see it in admin panel")

-- Remove old policy if it exists (then recreate)
DROP POLICY IF EXISTS "Admins can view all requests" ON public.special_requests;

CREATE POLICY "Admins can view all requests"
  ON public.special_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also ensure admins can update (reply, status)
DROP POLICY IF EXISTS "Admins can update requests" ON public.special_requests;

CREATE POLICY "Admins can update requests"
  ON public.special_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
