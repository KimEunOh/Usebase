-- Create full-text search index for BM25 search
-- This enables PostgreSQL's full-text search capabilities

-- Add a GIN index for full-text search on content column
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts 
ON document_chunks 
USING gin(to_tsvector('korean', content));

-- Create a function to calculate BM25-like scores
CREATE OR REPLACE FUNCTION calculate_bm25_score(
  query_text text,
  content_text text
) RETURNS float AS $$
DECLARE
  score float := 0.0;
  term text;
  term_count integer;
  total_terms integer;
BEGIN
  -- Simple BM25-like scoring
  -- This is a simplified version - for production, consider using pg_trgm or similar extensions
  
  -- Count query terms in content
  FOR term IN SELECT unnest(string_to_array(lower(query_text), ' '))
  LOOP
    IF term != '' THEN
      term_count := array_length(
        string_to_array(lower(content_text), lower(term)), 
        1
      ) - 1;
      
      IF term_count > 0 THEN
        score := score + (term_count * 1.0);
      END IF;
    END IF;
  END LOOP;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create a function for BM25 search
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