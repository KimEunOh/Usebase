import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IndexingService } from './indexing.service';
import { IndexingStatus } from '@shared/types';

@Controller('indexing')
@UseGuards(JwtAuthGuard)
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post(':documentId')
  async indexDocument(
    @Param('documentId') documentId: string,
    @Request() req,
  ): Promise<IndexingStatus> {
    const organizationId = req.user.organization_id;
    
    // 실제 구현에서는 파일을 업로드받아서 처리
    // 여기서는 간단한 예시
    const fileBuffer = Buffer.from('dummy content');
    
    return this.indexingService.indexDocument(documentId, organizationId, fileBuffer);
  }

  @Get(':documentId/status')
  async getIndexingStatus(
    @Param('documentId') documentId: string,
  ): Promise<IndexingStatus | null> {
    return this.indexingService.getIndexingStatus(documentId);
  }

  @Post('batch')
  async batchIndexDocuments(
    @Body() body: { document_ids: string[] },
    @Request() req,
  ): Promise<IndexingStatus[]> {
    const organizationId = req.user.organization_id;
    return this.indexingService.batchIndexDocuments(body.document_ids, organizationId);
  }
} 