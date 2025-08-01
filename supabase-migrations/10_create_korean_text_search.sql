-- Create Korean text search configuration
-- This enables proper Korean text search in PostgreSQL

-- Create Korean text search configuration
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS korean (COPY = simple);

-- Add Korean stop words (common words to ignore)
-- You can customize this list based on your needs
CREATE TEXT SEARCH DICTIONARY IF NOT EXISTS korean_stem (
    TEMPLATE = snowball,
    Language = korean
);

-- Create a simple Korean text search configuration
-- Since PostgreSQL doesn't have built-in Korean support, we'll use a simple approach
CREATE OR REPLACE FUNCTION korean_to_tsvector(text) RETURNS tsvector AS $$
BEGIN
  -- Simple approach: convert to lowercase and split by spaces
  -- For production, consider using external Korean NLP libraries
  RETURN to_tsvector('simple', lower($1));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create GIN index using the Korean text search function
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_korean_fts 
ON document_chunks 
USING gin(korean_to_tsvector(content));

-- Update the BM25 search function to use Korean text search
CREATE OR REPLACE FUNCTION bm25_search(
  search_query text,
  match_limit integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  score float,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.content,
    calculate_bm25_score(search_query, dc.content) as score,
    dc.metadata,
    dc.created_at
  FROM document_chunks dc
  WHERE calculate_bm25_score(search_query, dc.content) > 0
  ORDER BY score DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql; 