import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new BadRequestException(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new BadRequestException(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async generateEmbeddingsBatch(texts: string[], batchSize: number = 100): Promise<number[][]> {
    console.log('=== EMBEDDINGS SERVICE: GENERATING BATCH ===');
    console.log('Number of texts:', texts.length);
    console.log('Sample text length:', texts[0]?.length);
    console.log('Sample text preview:', texts[0]?.substring(0, 100));
    
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}, size: ${batch.length}`);
      const batchEmbeddings = await this.generateEmbeddings(batch);
      console.log(`Batch ${i / batchSize + 1} embeddings generated, length: ${batchEmbeddings.length}`);
      console.log(`Sample embedding length: ${batchEmbeddings[0]?.length}`);
      embeddings.push(...batchEmbeddings);
    }

    console.log('Total embeddings generated:', embeddings.length);
    return embeddings;
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }
} 