-- Ensures admins can manage wholesale passwords from the admin panel (insert, delete).
-- Run this in Supabase SQL Editor if admins get "permission denied" when adding/deleting passwords.
-- Prerequisite: has_role(auth.uid(), 'admin'::app_role) must exist.

-- Admins can insert (create/generate passwords)
DROP POLICY IF EXISTS "Admins can insert passwords" ON public.customer_passwords;
CREATE POLICY "Admins can insert passwords"
  ON public.customer_passwords
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete passwords
DROP POLICY IF EXISTS "Admins can delete passwords" ON public.customer_passwords;
CREATE POLICY "Admins can delete passwords"
  ON public.customer_passwords
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure admins can view (may already exist)
DROP POLICY IF EXISTS "Admins can view passwords" ON public.customer_passwords;
CREATE POLICY "Admins can view passwords"
  ON public.customer_passwords
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure admins can update (e.g. deactivate)
DROP POLICY IF EXISTS "Admins can update passwords" ON public.customer_passwords;
CREATE POLICY "Admins can update passwords"
  ON public.customer_passwords
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
