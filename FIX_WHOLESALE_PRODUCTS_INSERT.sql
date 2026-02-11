-- Run this in Supabase SQL Editor if "Failed to create product" appears.
-- Ensures wholesale_products allows authenticated users to insert/update.

-- 1. Ensure required columns exist (skip if already there)
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE;
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Allow authenticated users to insert and update
DROP POLICY IF EXISTS "Authenticated can manage products" ON public.wholesale_products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.wholesale_products;
CREATE POLICY "Authenticated can manage products"
  ON public.wholesale_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
