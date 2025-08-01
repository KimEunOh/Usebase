-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT,
  organization_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_chunks table with vector support
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_organization_id ON document_chunks(organization_id);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's documents" ON documents
  FOR SELECT USING (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can insert their organization's documents" ON documents
  FOR INSERT WITH CHECK (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can update their organization's documents" ON documents
  FOR UPDATE USING (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can delete their organization's documents" ON documents
  FOR DELETE USING (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can view their organization's document chunks" ON document_chunks
  FOR SELECT USING (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can insert their organization's document chunks" ON document_chunks
  FOR INSERT WITH CHECK (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can update their organization's document chunks" ON document_chunks
  FOR UPDATE USING (organization_id = current_setting('app.organization_id', true)::text);

CREATE POLICY "Users can delete their organization's document chunks" ON document_chunks
  FOR DELETE USING (organization_id = current_setting('app.organization_id', true)::text); 