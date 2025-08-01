import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SearchModule } from '../search/search.module';
import { CacheModule } from '../cache/cache.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [SearchModule, CacheModule, BillingModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {} 