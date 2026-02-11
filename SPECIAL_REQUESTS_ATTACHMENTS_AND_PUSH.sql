-- Run in Supabase Dashboard → SQL Editor
-- 1. Add column for admin reply attachment
ALTER TABLE public.special_requests
ADD COLUMN IF NOT EXISTS admin_attachment_url text;

-- 2. Create the storage bucket (fixes "bucket not found")
-- Run this; if you get "permission denied", create the bucket in Dashboard instead (see note at end).
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', true);
-- If the bucket already exists you may get a unique violation; that's fine.

-- 3. Allow users to upload their own request attachments (path: user_id/...)
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own request attachments" ON storage.objects;
CREATE POLICY "Users can upload own request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Anyone can read (public bucket)
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
CREATE POLICY "Anyone can view request attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-attachments');

-- 5. Allow admins to upload (for reply attachments)
DROP POLICY IF EXISTS "Admins can upload request attachments" ON storage.objects;
CREATE POLICY "Admins can upload request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can update request attachments" ON storage.objects;
CREATE POLICY "Admins can update request attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'request-attachments' AND has_role(auth.uid(), 'admin'::app_role));

-- If INSERT into storage.buckets fails (permission/RLS), create the bucket manually:
-- Supabase Dashboard → Storage → New bucket → Name: request-attachments → Public: On → Create.
