import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from '@shared/types';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let configService: ConfigService;

  const createMockQuery = (finalData: any = [], finalError: any = null) => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: finalData, error: finalError }),
    };
    return mockQuery;
  };

  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(createMockQuery()),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
    storage: {
      from: jest.fn(),
    },
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
        DocumentsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    configService = module.get<ConfigService>(ConfigService);

    // Supabase 클라이언트 모킹
    (service as any).supabase = mockSupabaseClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a document successfully', async () => {
      const createDocumentDto = {
        title: 'Test Document',
        file_path: 'test/path',
        file_type: 'application/pdf',
        file_size: 1024,
        organization_id: 'org-1',
        uploaded_by: 'user-1',
      };

      const expectedDocument: Document = {
        id: 'doc-1',
        ...createDocumentDto,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: expectedDocument, error: null }),
          }),
        }),
      });

      const result = await service.create(createDocumentDto);

      expect(result).toEqual(expectedDocument);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('documents');
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDocumentDto = {
        title: 'Test Document',
        file_path: 'test/path',
        file_type: 'application/pdf',
        file_size: 1024,
        organization_id: 'org-1',
        uploaded_by: 'user-1',
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          }),
        }),
      });

      await expect(service.create(createDocumentDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all documents for organization', async () => {
      const organizationId = 'org-1';
      const expectedDocuments: Document[] = [
        {
          id: 'doc-1',
          title: 'Document 1',
          file_path: 'test/path1',
          file_type: 'application/pdf',
          file_size: 1024,
          organization_id: organizationId,
          uploaded_by: 'user-1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockQuery = createMockQuery(expectedDocuments, null);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await service.findAll(organizationId);

      expect(result).toEqual(expectedDocuments);
    });

    it('should return user documents when userId is provided', async () => {
      const organizationId = 'org-1';
      const userId = 'user-1';
      const expectedDocuments: Document[] = [];

      // 동적으로 Mock 객체 생성
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      // 마지막 eq 호출을 위한 별도 처리
      mockQuery.eq.mockImplementation((key: string, value: any) => {
        if (key === 'uploaded_by') {
          return { data: expectedDocuments, error: null };
        }
        return mockQuery;
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await service.findAll(organizationId, userId);

      expect(result).toEqual(expectedDocuments);
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const documentId = 'doc-1';
      const organizationId = 'org-1';
      const expectedDocument: Document = {
        id: documentId,
        title: 'Test Document',
        file_path: 'test/path',
        file_type: 'application/pdf',
        file_size: 1024,
        organization_id: organizationId,
        uploaded_by: 'user-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: expectedDocument, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.findOne(documentId, organizationId);

      expect(result).toEqual(expectedDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = 'doc-1';
      const organizationId = 'org-1';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.findOne(documentId, organizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a document', async () => {
      const documentId = 'doc-1';
      const organizationId = 'org-1';

      // findOne을 위한 mock query
      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: documentId }, error: null }),
      };

      // update를 위한 mock query
      const mockUpdateQuery = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockFindQuery),
        update: jest.fn().mockReturnValue(mockUpdateQuery),
      });

      await expect(service.remove(documentId, organizationId)).resolves.not.toThrow();
    });
  });
}); 