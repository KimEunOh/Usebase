-- Create indexing_status table
CREATE TABLE IF NOT EXISTS indexing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  processed_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_indexing_status_document_id ON indexing_status(document_id);
CREATE INDEX IF NOT EXISTS idx_indexing_status_status ON indexing_status(status);

-- Enable RLS
ALTER TABLE indexing_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's indexing status" ON indexing_status
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE organization_id = current_setting('app.organization_id', true)::text
    )
  );

CREATE POLICY "Users can insert indexing status for their documents" ON indexing_status
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM documents 
      WHERE organization_id = current_setting('app.organization_id', true)::text
    )
  );

CREATE POLICY "Users can update indexing status for their documents" ON indexing_status
  FOR UPDATE USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE organization_id = current_setting('app.organization_id', true)::text
    )
  ); 