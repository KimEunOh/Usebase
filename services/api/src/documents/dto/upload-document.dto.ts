import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  folder_id?: string;

  @IsOptional()
  @IsString()
  tags?: string;
} 