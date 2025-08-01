import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { SearchQuery, SearchResult } from '@shared/types';

describe('SearchService', () => {
  let service: SearchService;
  let embeddingsService: EmbeddingsService;
  let configService: ConfigService;

  const mockSupabaseClient = {
    rpc: jest.fn(),
    from: jest.fn(),
  };

  const mockEmbeddingsService = {
    generateEmbedding: jest.fn(),
    generateEmbeddingsBatch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'https://test.supabase.co';
        case 'SUPABASE_SERVICE_ROLE_KEY':
          return 'test-service-role-key';
        default:
          return undefined;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmbeddingsService,
          useValue: mockEmbeddingsService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
    configService = module.get<ConfigService>(ConfigService);

    // Supabase 클라이언트 모킹
    (service as any).supabase = mockSupabaseClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchDocuments', () => {
    it('should search documents successfully', async () => {
      const searchQuery: SearchQuery = {
        query: 'test query',
        organization_id: 'org-1',
        limit: 10,
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockVectorResults = [
        {
          id: 'chunk-1',
          document_id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          similarity: 0.8,
          metadata: { paragraph_index: 0 },
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockTextResults = [
        {
          id: 'chunk-2',
          document_id: 'doc-2',
          content: 'Another content',
          metadata: { paragraph_index: 0 },
          created_at: '2023-01-01T00:00:00Z',
          documents: { title: 'Another Document' },
        },
      ];

      mockEmbeddingsService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockVectorResults,
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockTextResults,
          error: null,
        }),
      });

      const result = await service.searchDocuments(searchQuery);

      expect(result).toHaveLength(2);
      expect(mockEmbeddingsService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('match_documents', {
        query_embedding: mockEmbedding,
        match_threshold: 0.7,
        match_count: 10,
        organization_id: 'org-1',
      });
    });

    it('should throw BadRequestException when search fails', async () => {
      const searchQuery: SearchQuery = {
        query: 'test query',
        organization_id: 'org-1',
      };

      mockEmbeddingsService.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      await expect(service.searchDocuments(searchQuery)).rejects.toThrow(BadRequestException);
    });
  });

  describe('indexDocument', () => {
    it('should index document successfully', async () => {
      const documentId = 'doc-1';
      const organizationId = 'org-1';
      const content = 'Test document content';

      const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
      mockEmbeddingsService.generateEmbeddingsBatch.mockResolvedValue(mockEmbeddings);

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      await expect(service.indexDocument(documentId, organizationId, content)).resolves.not.toThrow();

      expect(mockEmbeddingsService.generateEmbeddingsBatch).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('document_chunks');
    });

    it('should throw BadRequestException when indexing fails', async () => {
      const documentId = 'doc-1';
      const organizationId = 'org-1';
      const content = 'Test document content';

      mockEmbeddingsService.generateEmbeddingsBatch.mockRejectedValue(new Error('Embedding failed'));

      await expect(service.indexDocument(documentId, organizationId, content)).rejects.toThrow(BadRequestException);
    });
  });

  describe('splitIntoChunks', () => {
    it('should split text into chunks correctly', async () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      
      // private 메서드 테스트를 위해 any로 캐스팅
      const result = await (service as any).splitIntoChunks(text, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('sentence');
    });

    it('should filter out chunks that are too short', async () => {
      const text = 'Short. This is a longer sentence. Another short one. This is another longer sentence.';
      
      const result = await (service as any).splitIntoChunks(text, 100);

      expect(result.length).toBeLessThan(4); // 짧은 청크들이 필터링됨
    });
  });
}); 