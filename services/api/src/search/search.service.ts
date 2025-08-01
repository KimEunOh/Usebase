import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SearchQuery, SearchResult } from '@shared/types';
import { EmbeddingsService } from '../embeddings/embeddings.service';

@Injectable()
export class SearchService {
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingsService: EmbeddingsService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async searchDocuments(searchQuery: SearchQuery): Promise<SearchResult[]> {
    console.log('=== HYBRID SEARCH DEBUG START ===');
    console.log('Search query:', searchQuery.query);
    console.log('Organization ID:', searchQuery.organization_id);
    console.log('Limit:', searchQuery.limit);

    try {
      // 1. 데이터베이스 연결 확인
      console.log('=== DATABASE CONNECTION CHECK ===');
      const { data: connectionTest, error: connectionError } = await this.supabase
        .from('document_chunks')
        .select('count')
        .limit(1);

      if (connectionError) {
        console.error('Database connection error:', connectionError);
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }
      console.log('Database connection successful');

      // 2. document_chunks 테이블 데이터 확인
      console.log('=== DOCUMENT_CHUNKS TABLE CHECK ===');
      const { data: allChunks, error: chunksError } = await this.supabase
        .from('document_chunks')
        .select('id, document_id, content, organization_id')
        .limit(5);

      if (chunksError) {
        console.error('Error fetching chunks:', chunksError);
      } else {
        console.log('Total chunks found:', allChunks?.length || 0);
        if (allChunks && allChunks.length > 0) {
          console.log('Sample chunk:', {
            id: allChunks[0].id,
            document_id: allChunks[0].document_id,
            content_preview: allChunks[0].content?.substring(0, 100),
            organization_id: allChunks[0].organization_id
          });
        }
      }

      // 3. 병렬로 BM25 검색과 벡터 검색 실행
      console.log('=== HYBRID SEARCH EXECUTION ===');
      const [bm25Results, vectorResults] = await Promise.allSettled([
        this.bm25Search(searchQuery.query, searchQuery),
        this.vectorSearchWithEmbedding(searchQuery.query, searchQuery)
      ]);

      console.log('BM25 search completed:', bm25Results.status);
      console.log('Vector search completed:', vectorResults.status);

      // 4. 결과 병합 및 하이브리드 랭킹
      console.log('=== HYBRID RANKING ===');
      const finalResults = this.hybridRanking(
        bm25Results.status === 'fulfilled' ? bm25Results.value : [],
        vectorResults.status === 'fulfilled' ? vectorResults.value : []
      );

      console.log('Final hybrid results:', finalResults.length);

          if (finalResults.length > 0) {
        console.log('Found hybrid search results, returning them');
        console.log('Top 3 results:');
        finalResults.slice(0, 3).forEach((result, index) => {
            console.log(`${index + 1}. Score: ${result.score}, Content: ${result.content.substring(0, 100)}...`);
        });
        console.log('=== HYBRID SEARCH DEBUG END ===');
        return finalResults.slice(0, searchQuery.limit || 10);
    }

      // 5. 모든 검색 실패
      console.log('=== NO HYBRID SEARCH RESULTS FOUND ===');
      console.log('Both text and vector search returned no results');
      console.log('=== HYBRID SEARCH DEBUG END ===');
      return [];
    } catch (error) {
      console.error('=== HYBRID SEARCH ERROR ===');
      console.error('Search failed with error:', error.message);
      console.error('Error stack:', error.stack);
      console.log('=== HYBRID SEARCH DEBUG END ===');
      return [];
    }
  }

  private async vectorSearch(
    queryEmbedding: number[],
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    console.log('=== VECTOR SEARCH DEBUG START ===');
    console.log('Organization ID for vector search:', searchQuery.organization_id);
    console.log('Query embedding length:', queryEmbedding.length);
    console.log('Match threshold: 0.7');
    console.log('Match count:', searchQuery.limit || 10);
    
    // 먼저 저장된 임베딩이 있는지 확인
    console.log('=== CHECKING STORED EMBEDDINGS ===');
    const { data: storedChunks, error: checkError } = await this.supabase
      .from('document_chunks')
      .select('id, embedding, organization_id')
      .eq('organization_id', searchQuery.organization_id)
      .limit(3);

    if (checkError) {
      console.error('Error checking stored embeddings:', checkError);
    } else {
      console.log('Stored chunks count:', storedChunks?.length || 0);
      if (storedChunks && storedChunks.length > 0) {
        console.log('Sample stored embedding length:', storedChunks[0].embedding?.length);
        console.log('Sample organization_id:', storedChunks[0].organization_id);
      }
    }
    
    try {
      // 1. RPC 함수 호출 준비
      console.log('=== PREPARING RPC CALL ===');
      const rpcParams = {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // 임계값을 낮춤 (0.7 -> 0.3)
        match_count: searchQuery.limit || 10,
        organization_id: null, // 필터링 제거
      };
      
      console.log('RPC parameters:', {
        query_embedding_length: queryEmbedding.length,
        match_threshold: rpcParams.match_threshold,
        match_count: rpcParams.match_count,
        organization_id: rpcParams.organization_id
      });
      
      // 2. RPC 함수 호출
      console.log('=== EXECUTING RPC CALL ===');
      const { data, error } = await this.supabase.rpc('match_documents', rpcParams);

      if (error) {
        console.error('=== VECTOR SEARCH ERROR ===');
        console.error('RPC error:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw new BadRequestException(`Vector search failed: ${error.message}`);
      }

      console.log('=== VECTOR SEARCH RESULTS ===');
      console.log('Raw results count:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('First result details:', {
          id: data[0].id,
          document_id: data[0].document_id,
          title: data[0].title,
          content_length: data[0].content?.length || 0,
          content_preview: data[0].content?.substring(0, 150),
          similarity: data[0].similarity
        });
        
        if (data.length > 1) {
          console.log('Second result similarity:', data[1].similarity);
        }
      } else {
        console.log('No vector search results found');
      }
      
      console.log('=== VECTOR SEARCH DEBUG END ===');

      return data.map((item: any) => ({
        id: item.id,
        document_id: item.document_id,
        title: item.title,
        content: item.content,
        score: item.similarity,
        metadata: item.metadata || {
          page_number: 1,
          section: 'default',
          paragraph_index: 0
        },
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('=== VECTOR SEARCH EXCEPTION ===');
      console.error('Exception in vectorSearch:', error.message);
      console.error('Exception stack:', error.stack);
      return [];
    }
  }

  private async vectorSearchWithEmbedding(
    query: string,
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    console.log('=== VECTOR SEARCH WITH EMBEDDING DEBUG START ===');
    console.log('Query:', query);

    try {
      // 1. 쿼리 임베딩 생성
      console.log('=== GENERATING QUERY EMBEDDING ===');
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
      console.log('Query embedding generated, length:', queryEmbedding.length);

      // 2. 벡터 검색 실행
      console.log('=== EXECUTING VECTOR SEARCH ===');
      const results = await this.vectorSearch(queryEmbedding, searchQuery);
      console.log('Vector search completed, results:', results.length);

      console.log('=== VECTOR SEARCH WITH EMBEDDING DEBUG END ===');
      return results;
    } catch (error) {
      console.error('=== VECTOR SEARCH WITH EMBEDDING ERROR ===');
      console.error('Error in vectorSearchWithEmbedding:', error.message);
      console.error('Error stack:', error.stack);
      return []; // 오류 시 빈 배열 반환
    }
  }

  private async bm25Search(
    query: string,
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    console.log('=== BM25 SEARCH DEBUG START ===');
    console.log('Query for BM25 search:', query);
    console.log('Organization ID for BM25 search:', searchQuery.organization_id);

    try {
      // 1. 쿼리 정규화
      const normalizedQuery = query.toLowerCase().trim();
      console.log('Normalized query:', normalizedQuery);

      // 2. BM25 검색을 위한 RPC 함수 호출
      console.log('=== BUILDING BM25 RPC CALL ===');

      // Simple BM25 RPC 함수 호출
      const { data, error } = await this.supabase.rpc('simple_bm25_search', {
        search_query: normalizedQuery,
        match_limit: searchQuery.limit || 10
      });

      if (error) {
        console.error('=== BM25 SEARCH ERROR ===');
        console.error('Database error:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);

        // BM25 실패 시 fallback으로 ILIKE 검색
        console.log('BM25 failed, falling back to ILIKE search');
        return this.fallbackTextSearch(normalizedQuery, searchQuery);
      }

      console.log('=== BM25 SEARCH RESULTS ===');
      console.log('Raw results count:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('First result details:', {
          id: data[0].id,
          document_id: data[0].document_id,
          content_length: data[0].content?.length || 0,
          content_preview: data[0].content?.substring(0, 150),
          organization_id: data[0].organization_id
        });
      } else {
        console.log('No BM25 results found, trying fallback');
        return this.fallbackTextSearch(normalizedQuery, searchQuery);
      }

      console.log('=== BM25 SEARCH DEBUG END ===');

      return data.map((item: any) => ({
        id: item.id,
        document_id: item.document_id,
        title: 'Uploaded Document',
        content: item.content,
        score: item.score || 0.8, // 실제 BM25 스코어 사용
        metadata: item.metadata || {
          page_number: 1,
          section: 'default',
          paragraph_index: 0
        },
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('=== BM25 SEARCH EXCEPTION ===');
      console.error('Exception in bm25Search:', error.message);
      console.error('Exception stack:', error.stack);
      return this.fallbackTextSearch(query, searchQuery);
    }
  }

  private async fallbackTextSearch(
    query: string,
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    console.log('=== FALLBACK TEXT SEARCH DEBUG START ===');
    console.log('Query for fallback search:', query);

    try {
      // 키워드 기반 검색 (ILIKE 사용)
      const keywords = query.split(' ').filter(k => k.length > 0);
      console.log('Keywords for search:', keywords);

      if (keywords.length === 0) {
        console.log('No valid keywords found');
        return [];
      }

      // 각 키워드에 대해 개별 검색 후 결과 병합
      let allResults: any[] = [];
      
      for (const keyword of keywords) {
        console.log(`Searching for keyword: "${keyword}"`);
        
        const { data: keywordResults, error: keywordError } = await this.supabase
          .from('document_chunks')
          .select('*')
          .ilike('content', `%${keyword}%`)
          .limit(searchQuery.limit || 10);

        if (keywordError) {
          console.error(`Error searching for keyword "${keyword}":`, keywordError);
          continue;
        }

        if (keywordResults && keywordResults.length > 0) {
          console.log(`Found ${keywordResults.length} results for keyword "${keyword}"`);
          allResults = allResults.concat(keywordResults);
        }
      }

      // 중복 제거
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.id === result.id)
      );

      console.log(`Total unique fallback results: ${uniqueResults.length}`);
      const data = uniqueResults.slice(0, searchQuery.limit || 10);
      const error = null;

      if (error) {
        console.error('=== FALLBACK SEARCH ERROR ===');
        console.error('Database error:', error);
        return [];
      }

      console.log('=== FALLBACK SEARCH RESULTS ===');
      console.log('Raw results count:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('First result details:', {
          id: data[0].id,
          document_id: data[0].document_id,
          content_length: data[0].content?.length || 0,
          content_preview: data[0].content?.substring(0, 150)
        });
      }

      console.log('=== FALLBACK TEXT SEARCH DEBUG END ===');

      return data.map((item: any) => ({
        id: item.id,
        document_id: item.document_id,
        title: 'Uploaded Document',
        content: item.content,
        score: 0.6, // Fallback 기본 스코어
        metadata: item.metadata || {
          page_number: 1,
          section: 'default',
          paragraph_index: 0
        },
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('=== FALLBACK SEARCH EXCEPTION ===');
      console.error('Exception in fallbackTextSearch:', error.message);
      console.error('Exception stack:', error.stack);
      return [];
    }
  }

  private hybridRanking(
    bm25Results: SearchResult[],
    vectorResults: SearchResult[],
  ): SearchResult[] {
    console.log('=== HYBRID RANKING DEBUG ===');
    console.log('BM25 results count:', bm25Results.length);
    console.log('Vector results count:', vectorResults.length);

    // 결과 병합 및 중복 제거
    const allResults = new Map<string, SearchResult>();

    // BM25 검색 결과 추가 (키워드 기반 랭킹, 높은 가중치)
    bm25Results.forEach(result => {
      allResults.set(result.id, {
        ...result,
        score: result.score * 0.6, // BM25 검색 가중치 (60%)
      });
      console.log(`Added BM25 result: ${result.id}, score: ${result.score * 0.6}`);
    });

    // 벡터 검색 결과 추가/업데이트 (의미적 유사성, 보조 가중치)
    vectorResults.forEach(result => {
      const existing = allResults.get(result.id);
      if (existing) {
        // 기존 결과가 있으면 스코어 결합 (하이브리드 점수)
        const hybridScore = existing.score + result.score * 0.4;
        existing.score = hybridScore;
        console.log(`Updated hybrid result: ${result.id}, final score: ${hybridScore}`);
      } else {
        allResults.set(result.id, {
          ...result,
          score: result.score * 0.4, // 벡터 검색 가중치 (40%)
        });
        console.log(`Added vector result: ${result.id}, score: ${result.score * 0.4}`);
      }
    });

    // 스코어로 정렬
    const rankedResults = Array.from(allResults.values()).sort((a, b) => b.score - a.score);

    console.log('=== HYBRID RANKING RESULTS ===');
    console.log('Total unique results:', rankedResults.length);
    if (rankedResults.length > 0) {
      console.log('Top result:', {
        id: rankedResults[0].id,
        score: rankedResults[0].score,
        content_preview: rankedResults[0].content?.substring(0, 100)
      });
    }

    console.log('=== HYBRID RANKING DEBUG END ===');
    return rankedResults;
  }

  async indexDocument(
    documentId: string,
    organizationId: string,
    content: string,
  ): Promise<void> {
    try {
      console.log('=== INDEX DOCUMENT DEBUG START ===');
      console.log('Document ID:', documentId);
      console.log('Organization ID:', organizationId);
      console.log('Content length:', content.length);

      // 1. 텍스트를 청크로 분할
      const chunks = this.splitIntoChunks(content);
      console.log('Number of chunks:', chunks.length);
      console.log('Sample chunk:', chunks[0]?.substring(0, 100));

      // 2. 각 청크에 대한 임베딩 생성
      console.log('Generating embeddings...');
      const embeddings = await this.embeddingsService.generateEmbeddingsBatch(chunks);
      console.log('Embeddings generated:', embeddings.length);
      console.log('Sample embedding length:', embeddings[0]?.length);

      // 3. 청크와 임베딩을 데이터베이스에 저장
      const chunkData = chunks.map((chunk, index) => ({
        document_id: documentId,
        content: chunk,
        embedding: embeddings[index],
        metadata: {
          paragraph_index: index,
        },
        organization_id: organizationId,
      }));

      console.log('Inserting chunks into database...');
      const { error } = await this.supabase
        .from('document_chunks')
        .insert(chunkData);

      if (error) {
        console.error('Database insert error:', error);
        throw new BadRequestException(`Failed to index document: ${error.message}`);
      }

      console.log('Chunks inserted successfully');
      console.log('=== INDEX DOCUMENT DEBUG END ===');
    } catch (error) {
      console.error('Indexing error:', error);
      throw new BadRequestException(`Indexing failed: ${error.message}`);
    }
  }

  private splitIntoChunks(text: string, maxChunkSize: number = 500): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50); // 너무 짧은 청크 제거
  }


} 