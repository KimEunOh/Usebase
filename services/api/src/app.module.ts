import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { OcrModule } from './ocr/ocr.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { SearchModule } from './search/search.module';
import { IndexingModule } from './indexing/indexing.module';
import { ChatModule } from './chat/chat.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TerminusModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    OcrModule,
    EmbeddingsModule,
    SearchModule,
    IndexingModule,
    ChatModule,
    BillingModule,
    // 개발 환경에서는 선택적으로 로드
    ...(process.env.NODE_ENV === 'production' ? [DatabaseModule, CacheModule, MessagingModule] : []),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {} 