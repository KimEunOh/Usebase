-- Add description column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add uploaded_by column to documents table (if not exists)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS uploaded_by UUID;

-- Add folder_id column to documents table (if not exists)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Add tags column to documents table (if not exists)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tags TEXT;

-- Add version column to documents table (if not exists)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add deleted_at column for soft delete (if not exists)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ; 