-- Run in Supabase SQL Editor if you get errors about "product_images" when saving a product with multiple images.
-- Creates the product_images table so one product can have up to 10 images.

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.wholesale_products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage product images" ON public.product_images;
CREATE POLICY "Authenticated can manage product images"
  ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
