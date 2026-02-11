-- =====================================================
-- FIX: "Bucket not found" when uploading Received in China photos
-- =====================================================
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- =====================================================

-- 1. Create the bucket (id must be exactly 'order-photos')
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-photos', 'order-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policies so anyone can view, admins can upload/update/delete
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
