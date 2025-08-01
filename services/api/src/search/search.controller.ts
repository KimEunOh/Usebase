import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQuery, SearchResult } from '@shared/types';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ results: SearchResult[]; total: number }> {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    const searchQuery: SearchQuery = {
      query: query.trim(),
      organization_id: req.user.organization_id,
      limit: limit ? Math.min(limit, 100) : 10, // 최대 100개로 제한
      offset: offset || 0,
    };

    const results = await this.searchService.searchDocuments(searchQuery);

    return {
      results,
      total: results.length, // 실제로는 전체 개수를 별도로 조회해야 함
    };
  }
} 