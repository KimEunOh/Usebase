-- Update match_documents function to remove organization_id filtering
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  organization_id text
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  title text,
  content text,
  similarity float,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.title,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata,
    dc.created_at
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$; 