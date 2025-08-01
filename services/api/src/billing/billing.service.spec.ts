import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { MessagingService } from '../messaging/messaging.service';
import { UsageMetrics } from '@shared/types';

describe('BillingService', () => {
  let service: BillingService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockMessagingService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MessagingService,
          useValue: mockMessagingService,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    databaseService = module.get(DatabaseService);
    cacheService = module.get(CacheService);
    messagingService = module.get(MessagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsageStats', () => {
    it('should return cached data if available', async () => {
      const mockData = {
        totalTokens: 1000,
        totalCost: 3.0,
        totalApiCalls: 10,
        monthlyUsage: [],
        organizationId: 'org-1',
      };

      cacheService.get.mockResolvedValue(mockData);

      const result = await service.getUsageStats('org-1');

      expect(result).toEqual(mockData);
      expect(cacheService.get).toHaveBeenCalledWith('usage:org-1:all:undefined');
      expect(databaseService.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result when cache miss', async () => {
      cacheService.get.mockResolvedValue(null);
      
      const mockDbResult = [
        {
          total_tokens: '1000',
          total_cost: '3.0',
          total_api_calls: '10',
          month: '2024-01-01',
          monthly_tokens: '1000',
          monthly_cost: '3.0',
          monthly_api_calls: '10',
        },
      ];

      databaseService.query.mockResolvedValue(mockDbResult);

      const result = await service.getUsageStats('org-1');

      expect(result.totalTokens).toBe(1000);
      expect(result.totalCost).toBe(3.0);
      expect(result.totalApiCalls).toBe(10);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      databaseService.query.mockRejectedValue(new Error('DB Error'));

      await expect(service.getUsageStats('org-1')).rejects.toThrow(
        '사용량 통계를 가져오는데 실패했습니다.'
      );
    });
  });

  describe('exportUsageData', () => {
    it('should generate CSV format correctly', async () => {
      const mockUsageData = {
        totalTokens: 1000,
        totalCost: 3.0,
        totalApiCalls: 10,
        monthlyUsage: [
          {
            date: '2024-01',
            tokens: 1000,
            cost: 3.0,
            apiCalls: 10,
          },
        ],
        organizationId: 'org-1',
      };

      jest.spyOn(service, 'getUsageStats').mockResolvedValue(mockUsageData);

      const result = await service.exportUsageData('org-1', {
        format: 'csv',
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        includeDetails: false,
      });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(/usage_report_.*\.csv/);
      expect(result.data).toContain('날짜,토큰 수,비용 (KRW),API 호출 수');
    });

    it('should generate PDF format correctly', async () => {
      const mockUsageData = {
        totalTokens: 1000,
        totalCost: 3.0,
        totalApiCalls: 10,
        monthlyUsage: [
          {
            date: '2024-01',
            tokens: 1000,
            cost: 3.0,
            apiCalls: 10,
          },
        ],
        organizationId: 'org-1',
      };

      jest.spyOn(service, 'getUsageStats').mockResolvedValue(mockUsageData);

      const result = await service.exportUsageData('org-1', {
        format: 'pdf',
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        includeDetails: false,
      });

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/usage_report_.*\.pdf/);
      expect(result.data).toContain('사용량 리포트');
    });
  });

  describe('recordUsage', () => {
    it('should record usage data and invalidate cache', async () => {
      const usageData: UsageMetrics = {
        user_id: 'user-1',
        organization_id: 'org-1',
        tokens_used: 100,
        api_calls: 1,
        cost: 0.3,
        date: '2024-01-01',
      };

      databaseService.query.mockResolvedValue([]);

      await service.recordUsage(usageData);

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usage_metrics'),
        [usageData.user_id, usageData.organization_id, usageData.tokens_used, usageData.api_calls, usageData.cost, usageData.date]
      );

      expect(cacheService.del).toHaveBeenCalledWith('usage:org-1:all');
      expect(cacheService.del).toHaveBeenCalledWith('usage:org-1:user-1');
      expect(messagingService.publish).toHaveBeenCalledWith('usage.recorded', expect.objectContaining(usageData));
    });

    it('should handle recording errors gracefully', async () => {
      const usageData: UsageMetrics = {
        user_id: 'user-1',
        organization_id: 'org-1',
        tokens_used: 100,
        api_calls: 1,
        cost: 0.3,
        date: '2024-01-01',
      };

      databaseService.query.mockRejectedValue(new Error('DB Error'));

      await expect(service.recordUsage(usageData)).rejects.toThrow(
        '사용량 기록에 실패했습니다.'
      );
    });
  });
}); 