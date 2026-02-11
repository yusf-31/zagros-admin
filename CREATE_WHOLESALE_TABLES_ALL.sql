-- Run this ENTIRE script in Supabase SQL Editor in one go.
-- Creates: product_categories → shops → wholesale_products (with shop_id)
-- Uses simple "authenticated can do all" policies so it works even if has_role/user_roles are not set up.

-- 1. Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- 2. Create product_categories (no dependencies)
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_ku TEXT,
  image_url TEXT,
  parent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON public.product_categories(parent_id);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Authenticated can manage categories"
  ON public.product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create shops (depends on product_categories)
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_ku TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shops_category_id ON public.shops(category_id);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage shops" ON public.shops;
DROP POLICY IF EXISTS "Admins can manage shops" ON public.shops;
CREATE POLICY "Authenticated can manage shops"
  ON public.shops FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create wholesale_products if missing (no shop_id at first)
CREATE TABLE IF NOT EXISTS public.wholesale_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add shop_id to wholesale_products (after shops exists)
ALTER TABLE public.wholesale_products
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_wholesale_products_shop_id ON public.wholesale_products(shop_id);

ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage products" ON public.wholesale_products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.wholesale_products;
CREATE POLICY "Authenticated can manage products"
  ON public.wholesale_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_wholesale_products_updated_at ON public.wholesale_products;
CREATE TRIGGER update_wholesale_products_updated_at
  BEFORE UPDATE ON public.wholesale_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
