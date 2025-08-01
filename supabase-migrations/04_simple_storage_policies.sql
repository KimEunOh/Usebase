-- Simple RLS policies for development mode
-- These policies allow all operations for development purposes

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all operations for documents bucket (development only)
CREATE POLICY "Allow all operations for documents bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'documents');

-- Alternative: If the above doesn't work, try this more permissive policy
-- CREATE POLICY "Allow all storage operations" ON storage.objects
--   FOR ALL USING (true); 