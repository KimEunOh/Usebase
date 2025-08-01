import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchResult } from '@shared/types';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let searchService: SearchService;

  const mockSearchService = {
    searchDocuments: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: 'user-1',
        organization_id: 'org-1',
      };
      return true;
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    searchService = moduleFixture.get<SearchService>(SearchService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /search', () => {
    it('should return search results', async () => {
      const mockResults: SearchResult[] = [
        {
          id: 'chunk-1',
          document_id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          score: 0.8,
          metadata: { paragraph_index: 0 },
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockSearchService.searchDocuments.mockResolvedValue(mockResults);

      const response = await request(app.getHttpServer())
        .get('/search?q=test query&limit=10')
        .expect(200);

      expect(response.body).toEqual({
        results: mockResults,
        total: mockResults.length,
      });
      expect(mockSearchService.searchDocuments).toHaveBeenCalledWith({
        query: 'test query',
        organization_id: 'org-1',
        limit: 10,
        offset: 0,
      });
    });

    it('should return empty results for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/search?q=')
        .expect(200);

      expect(response.body).toEqual({
        results: [],
        total: 0,
      });
      expect(mockSearchService.searchDocuments).not.toHaveBeenCalled();
    });

    it('should limit results to maximum 100', async () => {
      mockSearchService.searchDocuments.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/search?q=test&limit=150')
        .expect(200);

      expect(mockSearchService.searchDocuments).toHaveBeenCalledWith({
        query: 'test',
        organization_id: 'org-1',
        limit: 100, // 최대값으로 제한됨
        offset: 0,
      });
    });

    it('should handle search service errors', async () => {
      mockSearchService.searchDocuments.mockRejectedValue(new Error('Search failed'));

      await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(500); // Internal Server Error로 변경
    });
  });
}); 