-- Supabase Storage Buckets Setup
-- Apply policies after creating buckets: resumes, cover_letters

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


