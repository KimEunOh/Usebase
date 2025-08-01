import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;
} 