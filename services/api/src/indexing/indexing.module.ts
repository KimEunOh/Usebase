import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexingController } from './indexing.controller';
import { IndexingService } from './indexing.service';
import { OcrModule } from '../ocr/ocr.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [ConfigModule, OcrModule, SearchModule],
  controllers: [IndexingController],
  providers: [IndexingService],
  exports: [IndexingService],
})
export class IndexingModule {} 