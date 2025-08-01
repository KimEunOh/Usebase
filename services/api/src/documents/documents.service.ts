import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Document } from '@shared/types';
import { IndexingService } from '../indexing/indexing.service';

export interface CreateDocumentDto {
  title: string;
  description?: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  organization_id: string;
  user_id: string; // uploaded_by 대신 user_id 사용
  folder_id?: string | null;
  tags?: string | null;
  version?: number;
}

export interface UpdateDocumentDto {
  title?: string;
  description?: string;
  folder_id?: string;
  tags?: string;
}

@Injectable()
export class DocumentsService {
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly indexingService: IndexingService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== SUPABASE CONNECTION DEBUG ===');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key exists:', !!supabaseKey);
    console.log('Supabase Key length:', supabaseKey?.length);
    
    this.supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('Supabase client created successfully');
    console.log('=== SUPABASE CONNECTION DEBUG END ===');
  }

  async create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    console.log('=== DOCUMENT CREATION DEBUG ===');
    console.log('Creating document with data:', createDocumentDto);
    
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          ...createDocumentDto,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new BadRequestException(`Failed to create document: ${error.message}`);
      }

      console.log('Document created in database:', data);
      console.log('=== DOCUMENT CREATION DEBUG END ===');
      
      // 자동 인덱싱 시작
      try {
        console.log('=== AUTO INDEXING START ===');
        console.log('Starting automatic indexing for document:', data.id);
        
        // 파일 버퍼 가져오기 (업로드된 파일에서)
        const fileBuffer = await this.getFileBuffer(data.file_path);
        
        // 인덱싱 실행
        const indexingResult = await this.indexingService.indexDocument(
          data.id,
          data.organization_id,
          fileBuffer
        );
        
        console.log('Indexing completed:', indexingResult);
        console.log('=== AUTO INDEXING END ===');
      } catch (indexingError) {
        console.error('=== AUTO INDEXING ERROR ===');
        console.error('Indexing failed:', indexingError);
        console.error('=== AUTO INDEXING ERROR END ===');
        // 인덱싱 실패해도 문서 생성은 성공으로 처리
      }
      
      return data;
    } catch (error) {
      console.error('=== DOCUMENT CREATION ERROR ===');
      console.error('Error creating document:', error);
      console.error('=== DOCUMENT CREATION ERROR END ===');
      throw error;
    }
  }

  async findAll(organizationId: string, userId?: string): Promise<Document[]> {
    console.log('=== FIND ALL DOCUMENTS DEBUG ===');
    console.log('Organization ID:', organizationId);
    console.log('User ID:', userId);
    
    try {
      // 먼저 모든 문서를 가져와서 필터링
      let query = this.supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw new BadRequestException(`Failed to fetch documents: ${error.message}`);
      }

      // 클라이언트 사이드에서 deleted_at이 null인 문서만 필터링
      const filteredData = data?.filter(doc => doc.deleted_at === null) || [];
      
      console.log('Total documents found:', data?.length || 0);
      console.log('Filtered documents (not deleted):', filteredData.length);
      console.log('=== FIND ALL DOCUMENTS DEBUG END ===');
      
      return filteredData;
    } catch (error) {
      console.error('FindAll error:', error);
      throw error;
    }
  }

  async findOne(id: string, organizationId: string): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Document not found');
    }

    return data;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, organizationId: string): Promise<Document> {
    // 문서 존재 확인
    await this.findOne(id, organizationId);

    const { data, error } = await this.supabase
      .from('documents')
      .update({
        ...updateDocumentDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update document: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    // 문서 존재 확인
    await this.findOne(id, organizationId);

    // 소프트 삭제
    const { error } = await this.supabase
      .from('documents')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete document: ${error.message}`);
    }
  }

  private sanitizeFileName(fileName: string): string {
    // 한글, 특수문자, 공백을 안전한 형식으로 변환
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // 영문, 숫자, 점, 하이픈만 허용
      .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
      .replace(/^_|_$/g, '') // 앞뒤 언더스코어 제거
      .substring(0, 100); // 길이 제한
  }

  async uploadFile(file: Express.Multer.File, organizationId: string, userId: string): Promise<string> {
    try {
      const originalFileName = file.originalname;
      const sanitizedFileName = this.sanitizeFileName(originalFileName);
      const fileName = `${organizationId}/${Date.now()}-${sanitizedFileName}`;
      
      console.log('=== FILE UPLOAD DEBUG ===');
      console.log('Original filename:', originalFileName);
      console.log('Sanitized filename:', sanitizedFileName);
      console.log('Final path:', fileName);
      console.log('File size:', file.size, 'Type:', file.mimetype);
      
      const { data, error } = await this.supabase.storage
        .from('documents')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw new BadRequestException(`Failed to upload file: ${error.message}`);
      }

      console.log('File uploaded successfully to Supabase:', data.path);
      console.log('=== FILE UPLOAD DEBUG END ===');
      return data.path;
    } catch (error) {
      console.error('File upload error:', error);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from('documents')
      .remove([filePath]);

    if (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    const { data } = this.supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    console.log('Getting file buffer for path:', filePath);
    
    const { data, error } = await this.supabase.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('Failed to download file:', error);
      throw new BadRequestException(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new BadRequestException('File not found');
    }

    console.log('File downloaded successfully, size:', data.size);
    return Buffer.from(await data.arrayBuffer());
  }

  async getVersions(documentId: string, organizationId: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('original_document_id', documentId)
      .eq('organization_id', organizationId)
      .order('version', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch document versions: ${error.message}`);
    }

    return data || [];
  }

  // Storage 연결 테스트 메서드
  async testStorageConnection(): Promise<boolean> {
    console.log('=== STORAGE CONNECTION TEST ===');
    try {
      const { data, error } = await this.supabase.storage
        .from('documents')
        .list('', { limit: 1 });

      if (error) {
        console.error('Storage connection error:', error);
        return false;
      }

      console.log('Storage connection successful');
      console.log('Available files:', data?.length || 0);
      console.log('=== STORAGE CONNECTION TEST END ===');
      return true;
    } catch (error) {
      console.error('Storage connection test failed:', error);
      return false;
    }
  }

  // 인덱싱된 데이터 확인 메서드
  async getIndexedDataDebug(): Promise<any> {
    console.log('=== INDEXED DATA DEBUG ===');
    
    try {
      // 문서 목록 조회
      const documents = await this.findAll('dev-org', '00000000-0000-0000-0000-000000000001');
      console.log('Documents found:', documents.length);
      
      // document_chunks 테이블 확인
      const { data: chunks, error: chunksError } = await this.supabase
        .from('document_chunks')
        .select('*')
        .limit(10);
      
      if (chunksError) {
        console.error('Error fetching chunks:', chunksError);
        return { error: chunksError.message };
      }
      
      console.log('Document chunks found:', chunks?.length || 0);
      
      // indexing_status 테이블 확인
      const { data: indexingStatus, error: statusError } = await this.supabase
        .from('indexing_status')
        .select('*')
        .limit(10);
      
      if (statusError) {
        console.error('Error fetching indexing status:', statusError);
      } else {
        console.log('Indexing status entries:', indexingStatus?.length || 0);
      }
      
      console.log('=== INDEXED DATA DEBUG END ===');
      
      return {
        documents: documents.length,
        chunks: chunks?.length || 0,
        indexingStatus: indexingStatus?.length || 0,
        sampleChunks: chunks?.slice(0, 3) || [],
        sampleStatus: indexingStatus?.slice(0, 3) || []
      };
    } catch (error) {
      console.error('Debug method error:', error);
      return { error: error.message };
    }
  }

  // organization_id 디버깅 메서드
  async getOrganizationIdsDebug(): Promise<any> {
    console.log('=== ORGANIZATION ID DEBUG ===');
    
    try {
      // documents 테이블의 organization_id 확인
      const { data: documents, error: docsError } = await this.supabase
        .from('documents')
        .select('id, title, organization_id')
        .limit(10);
      
      if (docsError) {
        console.error('Error fetching documents:', docsError);
        return { error: docsError.message };
      }
      
      // document_chunks 테이블의 organization_id 확인
      const { data: chunks, error: chunksError } = await this.supabase
        .from('document_chunks')
        .select('id, document_id, organization_id, content')
        .limit(10);
      
      if (chunksError) {
        console.error('Error fetching chunks:', chunksError);
        return { error: chunksError.message };
      }
      
      console.log('=== ORGANIZATION ID DEBUG END ===');
      
      return {
        documents: documents || [],
        chunks: chunks || [],
        message: 'Organization IDs retrieved successfully'
      };
    } catch (error) {
      console.error('Organization ID debug error:', error);
      return { error: error.message };
    }
  }

  // 모든 데이터 확인 메서드
  async getAllDataDebug(): Promise<any> {
    console.log('=== ALL DATA DEBUG ===');
    
    try {
      // 1. documents 테이블 확인
      const { data: documents, error: docsError } = await this.supabase
        .from('documents')
        .select('*');
      
      if (docsError) {
        console.error('Error fetching documents:', docsError);
        return { error: docsError.message };
      }
      
      // 2. document_chunks 테이블 확인
      const { data: chunks, error: chunksError } = await this.supabase
        .from('document_chunks')
        .select('*');
      
      if (chunksError) {
        console.error('Error fetching chunks:', chunksError);
        return { error: chunksError.message };
      }
      
      // 3. indexing_status 테이블 확인
      const { data: indexingStatus, error: statusError } = await this.supabase
        .from('indexing_status')
        .select('*');
      
      if (statusError) {
        console.error('Error fetching indexing status:', statusError);
      }
      
      console.log('=== ALL DATA DEBUG END ===');
      
      return {
        documents: documents || [],
        chunks: chunks || [],
        indexingStatus: indexingStatus || [],
        summary: {
          documentsCount: documents?.length || 0,
          chunksCount: chunks?.length || 0,
          indexingStatusCount: indexingStatus?.length || 0
        }
      };
    } catch (error) {
      console.error('All data debug error:', error);
      return { error: error.message };
    }
  }
} 