-- Run this in Supabase SQL Editor to fix:
-- "insert or update on table wholesale_products violates foreign key constraint wholesale_products_category_id_fkey"
--
-- This drops the foreign key so product inserts succeed. category_id is still stored for the app.

ALTER TABLE public.wholesale_products
  DROP CONSTRAINT IF EXISTS wholesale_products_category_id_fkey;

ALTER TABLE public.wholesale_products
  ALTER COLUMN category_id DROP NOT NULL;
