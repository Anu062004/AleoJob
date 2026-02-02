-- Supabase Storage Setup for CVs
-- Run this in Supabase SQL Editor after creating the bucket in the dashboard

-- ============================================
-- Storage Bucket Policies for 'cvs' bucket
-- ============================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own CV" ON storage.objects;

-- Policy: Users can upload their own CV
CREATE POLICY "Users can upload their own CV"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = 'user_' || current_setting('app.aleo_address', TRUE)
);

-- Policy: Users can read their own CV
CREATE POLICY "Users can read their own CV"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = 'user_' || current_setting('app.aleo_address', TRUE)
);

-- Policy: Users can update their own CV (replace)
CREATE POLICY "Users can update their own CV"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = 'user_' || current_setting('app.aleo_address', TRUE)
);

-- Policy: Users can delete their own CV
CREATE POLICY "Users can delete their own CV"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = 'user_' || current_setting('app.aleo_address', TRUE)
);

-- ============================================
-- Instructions:
-- ============================================
-- 1. Go to Supabase Dashboard > Storage > Buckets
-- 2. Create a new bucket named "cvs"
-- 3. Set it to PRIVATE (not public)
-- 4. Then run this SQL file to set up the policies
-- ============================================







