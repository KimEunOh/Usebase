import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService, CreateDocumentDto, UpdateDocumentDto } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto as UpdateDocumentRequestDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: '.(pdf|doc|docx|txt|jpg|jpeg|png)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    console.log('=== FILE UPLOAD DEBUG START ===');
    console.log('Request received:', {
      title: uploadDocumentDto.title,
      description: uploadDocumentDto.description,
      fileSize: file.size,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    // 개발 모드에서는 기본값 사용
    const user = req.user || { 
      sub: '00000000-0000-0000-0000-000000000001', // 유효한 UUID 형식
      organization_id: 'dev-org' 
    };
    const organizationId = user.organization_id;
    
    console.log('User info:', { userId: user.sub, organizationId });

    try {
      // 파일 업로드
      console.log('Starting file upload to Supabase Storage...');
      const filePath = await this.documentsService.uploadFile(file, organizationId, user.sub);
      console.log('File upload completed. Path:', filePath);

      // 문서 메타데이터 생성
      const createDocumentDto: CreateDocumentDto = {
        title: uploadDocumentDto.title,
        description: uploadDocumentDto.description || null, // null 허용
        file_path: filePath,
        file_type: file.mimetype,
        file_size: file.size,
        organization_id: organizationId,
        user_id: user.sub, // uploaded_by 대신 user_id 사용
        folder_id: uploadDocumentDto.folder_id,
        tags: uploadDocumentDto.tags,
        version: 1,
      };

      console.log('Creating document metadata:', createDocumentDto);
      const document = await this.documentsService.create(createDocumentDto);
      console.log('Document created successfully:', document.id);
      console.log('=== FILE UPLOAD DEBUG END ===');
      
      return document;
    } catch (error) {
      console.error('=== FILE UPLOAD ERROR ===');
      console.error('Error during file upload:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('=== FILE UPLOAD ERROR END ===');
      throw error;
    }
  }

  @Get()
  async findAll(@Request() req) {
    // 개발 모드에서는 기본값 사용
    const user = req.user || { 
      sub: '00000000-0000-0000-0000-000000000001',
      organization_id: 'dev-org' 
    };
    const organizationId = user.organization_id;
    
    console.log('=== DOCUMENTS LIST DEBUG ===');
    console.log('User:', user);
    console.log('Organization ID:', organizationId);
    
    const documents = await this.documentsService.findAll(organizationId);
    console.log('Found documents:', documents.length);
    console.log('=== DOCUMENTS LIST DEBUG END ===');
    
    return documents;
  }

  @Get('my')
  async findMyDocuments(@Request() req) {
    const user = req.user || { 
      sub: '00000000-0000-0000-0000-000000000001', 
      organization_id: 'dev-org' 
    };
    const organizationId = user.organization_id;
    
    return this.documentsService.findAll(organizationId, user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const user = req.user || { organization_id: 'dev-org' };
    const organizationId = user.organization_id;
    
    return this.documentsService.findOne(id, organizationId);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string, @Request() req) {
    const user = req.user || { organization_id: 'dev-org' };
    const organizationId = user.organization_id;
    
    return this.documentsService.getVersions(id, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentRequestDto,
    @Request() req,
  ) {
    const user = req.user;
    const organizationId = user.organization_id;
    
    return this.documentsService.update(id, updateDocumentDto, organizationId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    // 개발 모드에서는 기본값 사용
    const user = req.user || { 
      sub: '00000000-0000-0000-0000-000000000001',
      organization_id: 'dev-org' 
    };
    const organizationId = user.organization_id;
    
    console.log('=== DOCUMENT DELETE DEBUG ===');
    console.log('Deleting document ID:', id);
    console.log('Organization ID:', organizationId);
    
    await this.documentsService.remove(id, organizationId);
    console.log('Document deleted successfully');
    console.log('=== DOCUMENT DELETE DEBUG END ===');
    
    return { message: 'Document deleted successfully' };
  }

  // Storage 연결 테스트 엔드포인트
  @Get('test/storage')
  async testStorage(@Request() req) {
    console.log('=== STORAGE TEST ENDPOINT CALLED ===');
    const isConnected = await this.documentsService.testStorageConnection();
    return { 
      storageConnected: isConnected,
      message: isConnected ? 'Storage connection successful' : 'Storage connection failed'
    };
  }

  // 인덱싱된 데이터 확인 엔드포인트
  @Get('debug/indexed-data')
  async getIndexedData(@Request() req) {
    return await this.documentsService.getIndexedDataDebug();
  }

  // organization_id 디버깅 엔드포인트
  @Get('debug/organization-ids')
  async getOrganizationIds(@Request() req) {
    return await this.documentsService.getOrganizationIdsDebug();
  }

  // 모든 데이터 확인 엔드포인트
  @Get('debug/all-data')
  async getAllData(@Request() req) {
    return await this.documentsService.getAllDataDebug();
  }
} 