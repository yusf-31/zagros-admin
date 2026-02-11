-- Add received_china_photo_urls to orders + storage bucket for photos
-- Run in Supabase SQL Editor if you haven't run the migration from the mobile app.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS received_china_photo_urls jsonb DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public) VALUES ('order-photos', 'order-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view order photos" ON storage.objects;
CREATE POLICY "Anyone can view order photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-photos');

DROP POLICY IF EXISTS "Admins can upload order photos" ON storage.objects;
CREATE POLICY "Admins can upload order photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-photos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update order photos" ON storage.objects;
CREATE POLICY "Admins can update order photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'order-photos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete order photos" ON storage.objects;
CREATE POLICY "Admins can delete order photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-photos' AND has_role(auth.uid(), 'admin'::app_role));
