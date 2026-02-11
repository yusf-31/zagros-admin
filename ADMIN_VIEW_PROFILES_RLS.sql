-- =====================================================
-- Allow admins to see customer names in the Orders dashboard
-- =====================================================
-- Run in Supabase: SQL Editor → New query → Paste → Run
-- =====================================================
-- Without this, the dashboard may show orders but customer
-- name/phone appear as "Customer". With this policy, admins
-- can read all profiles so names show correctly.
-- =====================================================

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
