import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { MessagingService } from '../messaging/messaging.service';
import { UsageMetrics } from '@shared/types';

export interface BillingUsageResponse {
  totalTokens: number;
  totalCost: number;
  totalApiCalls: number;
  monthlyUsage: {
    date: string;
    tokens: number;
    cost: number;
    apiCalls: number;
  }[];
  organizationId: string;
  userId?: string;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  includeDetails: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly messagingService: MessagingService,
  ) {}

  async getUsageStats(
    organizationId: string,
    userId?: string,
    dateRange?: { start: string; end: string },
  ): Promise<BillingUsageResponse> {
    try {
      const cacheKey = `usage:${organizationId}:${userId || 'all'}:${JSON.stringify(dateRange)}`;
      const cached = await this.cacheService.get<BillingUsageResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COALESCE(SUM(tokens_used), 0) as total_tokens,
          COALESCE(SUM(cost), 0) as total_cost,
          COALESCE(SUM(api_calls), 0) as total_api_calls,
          DATE_TRUNC('month', date) as month,
          SUM(tokens_used) as monthly_tokens,
          SUM(cost) as monthly_cost,
          SUM(api_calls) as monthly_api_calls
        FROM usage_metrics 
        WHERE organization_id = $1
        ${userId ? 'AND user_id = $2' : ''}
        ${dateRange ? 'AND date BETWEEN $3 AND $4' : ''}
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month DESC
        LIMIT 12
      `;

      const params = userId 
        ? [organizationId, userId, ...(dateRange ? [dateRange.start, dateRange.end] : [])]
        : [organizationId, ...(dateRange ? [dateRange.start, dateRange.end] : [])];

      const result = await this.databaseService.query(query, params);
      
      const totalStats = result.reduce((acc, row) => ({
        totalTokens: acc.totalTokens + parseInt(row.total_tokens || '0'),
        totalCost: acc.totalCost + parseFloat(row.total_cost || '0'),
        totalApiCalls: acc.totalApiCalls + parseInt(row.total_api_calls || '0'),
      }), { totalTokens: 0, totalCost: 0, totalApiCalls: 0 });

      const monthlyUsage = result.map(row => ({
        date: row.month,
        tokens: parseInt(row.monthly_tokens || '0'),
        cost: parseFloat(row.monthly_cost || '0'),
        apiCalls: parseInt(row.monthly_api_calls || '0'),
      }));

      const response: BillingUsageResponse = {
        ...totalStats,
        monthlyUsage,
        organizationId,
        userId,
      };

      // 5분간 캐시
      await this.cacheService.set(cacheKey, response, 300);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to get usage stats', error);
      throw new Error('사용량 통계를 가져오는데 실패했습니다.');
    }
  }

  async exportUsageData(
    organizationId: string,
    options: ExportOptions,
    userId?: string,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    try {
      const usageData = await this.getUsageStats(
        organizationId,
        userId,
        options.dateRange,
      );

      if (options.format === 'csv') {
        return this.generateCSV(usageData, options);
      } else {
        return this.generatePDF(usageData, options);
      }
    } catch (error) {
      this.logger.error('Failed to export usage data', error);
      throw new Error('사용량 데이터 내보내기에 실패했습니다.');
    }
  }

  private async generateCSV(
    data: BillingUsageResponse,
    options: ExportOptions,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const headers = ['날짜', '토큰 수', '비용 (KRW)', 'API 호출 수'];
    const rows = data.monthlyUsage.map(usage => [
      usage.date,
      usage.tokens.toString(),
      usage.cost.toFixed(2),
      usage.apiCalls.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const filename = `usage_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    return {
      data: csvContent,
      filename,
      contentType: 'text/csv',
    };
  }

  private async generatePDF(
    data: BillingUsageResponse,
    options: ExportOptions,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // PDF 생성 로직 (pdfkit 라이브러리 사용 예정)
    const pdfContent = `
      사용량 리포트
      
      총 토큰: ${data.totalTokens.toLocaleString()}
      총 비용: ${data.totalCost.toFixed(2)} KRW
      총 API 호출: ${data.totalApiCalls.toLocaleString()}
      
      월별 사용량:
      ${data.monthlyUsage.map(usage => 
        `${usage.date}: ${usage.tokens.toLocaleString()} 토큰, ${usage.cost.toFixed(2)} KRW`
      ).join('\n')}
    `;

    const filename = `usage_report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    return {
      data: pdfContent,
      filename,
      contentType: 'application/pdf',
    };
  }

  async recordUsage(usageData: UsageMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO usage_metrics (
          user_id, organization_id, tokens_used, api_calls, cost, date
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await this.databaseService.query(query, [
        usageData.user_id,
        usageData.organization_id,
        usageData.tokens_used,
        usageData.api_calls,
        usageData.cost,
        usageData.date,
      ]);

      // 캐시 무효화
      const cacheKeys = [
        `usage:${usageData.organization_id}:all`,
        `usage:${usageData.organization_id}:${usageData.user_id}`,
      ];
      
      for (const key of cacheKeys) {
        await this.cacheService.del(key);
      }

      // Kafka 이벤트 발행
      await this.messagingService.publish('usage.recorded', {
        ...usageData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to record usage', error);
      throw new Error('사용량 기록에 실패했습니다.');
    }
  }
} 