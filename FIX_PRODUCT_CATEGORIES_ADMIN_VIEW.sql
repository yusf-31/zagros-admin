-- If admins can create categories but don't see them in the list, run this in Supabase SQL Editor.
-- It ensures admins can SELECT (view) all rows in product_categories.
-- Prerequisite: has_role(auth.uid(), 'admin'::app_role) must exist and return true for admin users.

DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Admins can manage categories"
  ON public.product_categories
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- If your project uses user_roles table instead of app_role, use this instead (uncomment and comment out the above):
-- DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
-- CREATE POLICY "Admins can manage categories"
--   ON public.product_categories
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
--   )
--   WITH CHECK (
--     EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
--   );
