import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const kafkaUrl = this.configService.get<string>('KAFKA_URL') || 'localhost:9092';
    
    this.kafka = new Kafka({
      clientId: 'usebase-api',
      brokers: [kafkaUrl],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'usebase-api-group' });

    try {
      await this.producer.connect();
      console.log('✅ Kafka producer connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Kafka producer:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
    }
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (error) {
      console.error('Kafka send error:', error);
      throw error;
    }
  }

  async publish(topic: string, message: any): Promise<void> {
    return this.sendMessage(topic, message);
  }

  async subscribe(topic: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic, fromBeginning: true });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = JSON.parse(message.value.toString());
            await callback(value);
          } catch (error) {
            console.error('Error processing Kafka message:', error);
          }
        },
      });
    } catch (error) {
      console.error('Kafka subscribe error:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const metadata = await this.producer.send({
        topic: 'health-check',
        messages: [{ value: 'ping' }],
      });
      return { status: 'ok', metadata };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
} 