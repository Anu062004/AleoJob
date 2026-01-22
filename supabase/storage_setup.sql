-- Supabase Storage Buckets Setup
-- Run this in Supabase SQL Editor after creating buckets in the dashboard

-- Create storage buckets (run these commands in Supabase Dashboard > Storage first)
-- Then apply these policies

-- Storage Policies for 'resumes' bucket
CREATE POLICY "Users can upload their own resumes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Users can read their own resumes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Job givers can read resumes for their applications"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes' AND
  -- This would need to check if the resume belongs to an application for their job
  -- Implementation depends on your specific needs
  true
);

-- Storage Policies for 'cover_letters' bucket
CREATE POLICY "Users can upload their own cover letters"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cover_letters' AND
  (storage.foldername(name))[1] = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Users can read their own cover letters"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cover_letters' AND
  (storage.foldername(name))[1] = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Job givers can read cover letters for their applications"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cover_letters' AND
  true
);


