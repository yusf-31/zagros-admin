-- Run this in Supabase SQL Editor to fix:
-- "insert or update on table wholesale_products violates foreign key constraint wholesale_products_category_id_fkey"
--
-- This script: (1) ensures there is at least one category, (2) fixes shops that point to missing categories,
-- (3) makes category_id nullable on wholesale_products so inserts can succeed even if reference is missing.

-- 1. Ensure at least one category exists (if none, create "Default")
INSERT INTO public.product_categories (id, name, created_at, updated_at)
SELECT gen_random_uuid(), 'Default', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories LIMIT 1);

-- 2. Fix shops whose category_id does not exist in product_categories (point them to first category)
UPDATE public.shops s
SET category_id = (SELECT id FROM public.product_categories LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_categories c WHERE c.id = s.category_id
);

-- 3. Make wholesale_products.category_id nullable (so insert can use NULL if needed)
ALTER TABLE public.wholesale_products
  ALTER COLUMN category_id DROP NOT NULL;

-- 4. Optional: set any existing wholesale_products with invalid category_id to the first category
UPDATE public.wholesale_products wp
SET category_id = (SELECT id FROM public.product_categories LIMIT 1)
WHERE wp.category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.id = wp.category_id);
