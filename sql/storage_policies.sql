-- Storage bucket and RLS policies for photos
-- Run these commands in your Supabase SQL editor

-- 1. Create the photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated users to upload photos" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- 3. Allow public access to SELECT (download/view) files
CREATE POLICY "Allow public access to view photos" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'photos');

-- 4. Allow users to UPDATE their own files (optional)
CREATE POLICY "Allow users to update their own photos" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Allow users to DELETE their own files (optional)
CREATE POLICY "Allow users to delete their own photos" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Verify bucket configuration
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'photos';

-- 7. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
