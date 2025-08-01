import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { IndexingStatus } from '@shared/types';
import { OcrService } from '../ocr/ocr.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class IndexingService {
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly ocrService: OcrService,
    private readonly searchService: SearchService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async indexDocument(
    documentId: string,
    organizationId: string,
    fileBuffer: Buffer,
  ): Promise<IndexingStatus> {
    console.log('=== INDEXING DEBUG START ===');
    console.log('Document ID:', documentId);
    console.log('Organization ID:', organizationId);
    console.log('File buffer size:', fileBuffer.length);
    
    try {
      // 1. 인덱싱 상태 초기화
      console.log('=== STEP 1: INITIALIZING INDEXING STATUS ===');
      await this.updateIndexingStatus(documentId, {
        status: 'processing',
        progress: 0,
        total_chunks: 0,
        processed_chunks: 0,
      });
      console.log('Indexing status initialized');

      // 2. PDF에서 텍스트 추출
      console.log('=== STEP 2: EXTRACTING TEXT FROM PDF ===');
      const extractionResult = await this.ocrService.extractTextFromPdf(fileBuffer);
      console.log('Text extraction completed');
      console.log('Extracted text length:', extractionResult.text.length);
      console.log('Text preview:', extractionResult.text.substring(0, 200));

      // 3. 텍스트 전처리
      console.log('=== STEP 3: PREPROCESSING TEXT ===');
      const paragraphs = await this.ocrService.preprocessText(extractionResult.text);
      console.log('Text preprocessing completed');
      console.log('Number of paragraphs:', paragraphs.length);

      // 4. 인덱싱 상태 업데이트
      console.log('=== STEP 4: UPDATING INDEXING STATUS ===');
      await this.updateIndexingStatus(documentId, {
        status: 'processing',
        progress: 30,
        total_chunks: paragraphs.length,
        processed_chunks: 0,
      });
      console.log('Indexing status updated to 30%');

      // 5. 문서 인덱싱
      console.log('=== STEP 5: INDEXING DOCUMENT ===');
      await this.searchService.indexDocument(documentId, organizationId, extractionResult.text);
      console.log('Document indexing completed');

      // 6. 완료 상태 업데이트
      console.log('=== STEP 6: FINALIZING INDEXING ===');
      await this.updateIndexingStatus(documentId, {
        status: 'completed',
        progress: 100,
        total_chunks: paragraphs.length,
        processed_chunks: paragraphs.length,
      });
      console.log('Indexing status updated to 100%');

      const result: IndexingStatus = {
        document_id: documentId,
        status: 'completed' as const,
        progress: 100,
        total_chunks: paragraphs.length,
        processed_chunks: paragraphs.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('=== INDEXING COMPLETED SUCCESSFULLY ===');
      console.log('Final result:', result);
      console.log('=== INDEXING DEBUG END ===');
      
      return result;
    } catch (error) {
      console.error('=== INDEXING ERROR ===');
      console.error('Indexing failed with error:', error.message);
      console.error('Error stack:', error.stack);
      
      // 에러 상태 업데이트
      await this.updateIndexingStatus(documentId, {
        status: 'failed',
        progress: 0,
        total_chunks: 0,
        processed_chunks: 0,
        error_message: error.message,
      });

      console.log('=== INDEXING DEBUG END ===');
      throw new BadRequestException(`Indexing failed: ${error.message}`);
    }
  }

  async getIndexingStatus(documentId: string): Promise<IndexingStatus | null> {
    const { data, error } = await this.supabase
      .from('indexing_status')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  private async updateIndexingStatus(
    documentId: string,
    status: Partial<IndexingStatus>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('indexing_status')
      .upsert({
        document_id: documentId,
        ...status,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new BadRequestException(`Failed to update indexing status: ${error.message}`);
    }
  }

  async batchIndexDocuments(
    documentIds: string[],
    organizationId: string,
  ): Promise<IndexingStatus[]> {
    const results: IndexingStatus[] = [];

    for (const documentId of documentIds) {
      try {
        // 문서 정보 조회
        const { data: document } = await this.supabase
          .from('documents')
          .select('file_path')
          .eq('id', documentId)
          .single();

        if (!document) {
          throw new Error('Document not found');
        }

        // 파일 다운로드 (실제 구현에서는 Supabase Storage에서)
        // 여기서는 간단한 예시
        const fileBuffer = Buffer.from('dummy content');

        const status = await this.indexDocument(documentId, organizationId, fileBuffer);
        results.push(status);
      } catch (error) {
        results.push({
          document_id: documentId,
          status: 'failed',
          progress: 0,
          total_chunks: 0,
          processed_chunks: 0,
          error_message: error.message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return results;
  }
} 