-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for storage.objects
CREATE POLICY "Users can view their organization's documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = current_setting('app.organization_id', true)::text
  );

CREATE POLICY "Users can upload documents to their organization" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = current_setting('app.organization_id', true)::text
  );

CREATE POLICY "Users can update their organization's documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = current_setting('app.organization_id', true)::text
  );

CREATE POLICY "Users can delete their organization's documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = current_setting('app.organization_id', true)::text
  ); 