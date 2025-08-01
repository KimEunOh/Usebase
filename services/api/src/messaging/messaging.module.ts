import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

@Module({
  imports: [ConfigModule],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {} 