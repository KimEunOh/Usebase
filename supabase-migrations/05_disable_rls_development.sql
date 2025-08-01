-- Disable RLS for development mode (NOT FOR PRODUCTION)
-- This allows all storage operations without restrictions

-- Disable RLS on storage.objects for development
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Note: This should only be used in development
-- For production, proper RLS policies should be implemented 