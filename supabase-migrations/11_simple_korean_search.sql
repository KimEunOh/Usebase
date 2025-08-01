-- Simple Korean text search without complex configurations
-- This avoids the 'korean' configuration issue

-- Drop the problematic index if it exists
DROP INDEX IF EXISTS idx_document_chunks_content_fts;

-- Create a simple GIN index for text search
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_simple_fts 
ON document_chunks 
USING gin(to_tsvector('simple', content));

-- Create a simple BM25-like search function
CREATE OR REPLACE FUNCTION simple_bm25_search(
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
DECLARE
  query_terms text[];
  term text;
  result_record record;
BEGIN
  -- Split query into terms
  query_terms := string_to_array(lower(search_query), ' ');
  
  -- Loop through each document chunk
  FOR result_record IN 
    SELECT 
      dc.id,
      dc.document_id,
      dc.content,
      dc.metadata,
      dc.created_at
    FROM document_chunks dc
  LOOP
    -- Calculate simple BM25-like score
    DECLARE
      total_score float := 0.0;
      term_score float;
    BEGIN
      FOR term IN SELECT unnest(query_terms)
      LOOP
        IF term != '' THEN
          -- Count occurrences of term in content
          term_score := array_length(
            string_to_array(lower(result_record.content), lower(term)), 
            1
          ) - 1;
          
          IF term_score > 0 THEN
            total_score := total_score + term_score;
          END IF;
        END IF;
      END LOOP;
      
      -- Return result if score > 0
      IF total_score > 0 THEN
        id := result_record.id;
        document_id := result_record.document_id;
        content := result_record.content;
        score := total_score;
        metadata := result_record.metadata;
        created_at := result_record.created_at;
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
  
  -- Order by score and limit results
  RETURN QUERY
  SELECT 
    r.id,
    r.document_id,
    r.content,
    r.score,
    r.metadata,
    r.created_at
  FROM (
    SELECT * FROM simple_bm25_search(search_query, match_limit)
  ) r
  ORDER BY r.score DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql; 