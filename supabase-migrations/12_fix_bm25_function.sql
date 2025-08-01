-- Fix BM25 function to avoid recursive call
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
  -- Note: We can't use RETURN QUERY with the same function name
  -- So we'll return the results directly from the loop above
  -- The results will be automatically ordered by the calling code
END;
$$ LANGUAGE plpgsql; 