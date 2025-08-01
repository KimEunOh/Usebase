import { IsString, IsOptional } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

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