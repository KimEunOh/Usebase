import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search/search.service';
import { CacheService } from '../cache/cache.service';
import { BillingService } from '../billing/billing.service';
import { UsageMetrics } from '@shared/types';

export interface ChatResponse {
  content: string;
  sources: Source[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Source {
  document_id: string;
  title: string;
  content: string;
  score: number;
  page?: number;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
    private readonly billingService: BillingService,
  ) {}

  async generateResponse(
    query: string,
    userId: string,
    organizationId: string,
  ): Promise<ChatResponse> {
    // 캐시 확인
    const cacheKey = `chat:${organizationId}:${this.hashQuery(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // RAG 검색
    const searchResults = await this.searchService.searchDocuments({
      query,
      organization_id: organizationId,
      limit: 5,
      offset: 0,
    });

    // LLM 프롬프트 구성
    const context = this.buildContext(searchResults);
    const prompt = this.buildPrompt(query, context);

    // LLM 호출 (실제 구현에서는 OpenAI API 사용)
    const response = await this.callLLM(prompt);

    const result: ChatResponse = {
      content: response.content,
      sources: searchResults.map(result => ({
        document_id: result.document_id,
        title: result.title,
        content: result.content,
        score: result.score,
      })),
      usage: response.usage,
    };

    // 캐시 저장 (5분)
    await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

    // 사용량 기록
    await this.recordUsage(userId, organizationId, response.usage);

    return result;
  }

  async streamResponse(
    query: string,
    userId: string,
    organizationId: string,
    onChunk: (chunk: string) => void,
    onSources: (sources: Source[]) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    try {
      // RAG 검색
      const searchResults = await this.searchService.searchDocuments({
        query,
        organization_id: organizationId,
        limit: 5,
        offset: 0,
      });

      if (searchResults.length > 0) {
        onSources(searchResults.map(result => ({
          document_id: result.document_id,
          title: result.title,
          content: result.content,
          score: result.score,
        })));
      }

      // LLM 프롬프트 구성
      const context = this.buildContext(searchResults);
      const prompt = this.buildPrompt(query, context);

      // LLM 스트리밍 호출
      await this.streamLLM(prompt, onChunk);
    } catch (error) {
      console.error('Chat stream error:', error);
      onError(error.message);
    }
  }

  private buildContext(searchResults: any[]): string {
    if (searchResults.length === 0) {
      return '관련 문서를 찾을 수 없습니다.';
    }

    return searchResults
      .map((result, index) => {
        return `[문서 ${index + 1}]\n제목: ${result.title}\n내용: ${result.content}\n`;
      })
      .join('\n');
  }

  private buildPrompt(query: string, context: string): string {
    return `다음 문서들을 참고하여 질문에 답변해주세요.

참고 문서:
${context}

질문: ${query}

답변:`;
  }

  private async callLLM(prompt: string): Promise<{ content: string; usage: any }> {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '당신은 문서를 참고하여 질문에 답변하는 AI 어시스턴트입니다. 제공된 문서 내용을 기반으로 정확하고 유용한 답변을 제공하세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw new BadRequestException(`LLM 호출 실패: ${error.message}`);
    }
  }

  private async streamLLM(
    prompt: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    try {
      console.log('=== STREAM LLM DEBUG START ===');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '당신은 문서를 참고하여 질문에 답변하는 AI 어시스턴트입니다. 제공된 문서 내용을 기반으로 정확하고 유용한 답변을 제공하세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('=== STREAM LLM COMPLETED ===');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                chunkCount++;
                console.log(`Chunk ${chunkCount}: "${content}"`);
                // 청크를 즉시 전송 (중복 방지)
                onChunk(content);
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('LLM streaming error:', error);
      throw new BadRequestException(`LLM 스트리밍 호출 실패: ${error.message}`);
    }
  }

  private hashQuery(query: string): string {
    // 간단한 해시 함수
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return hash.toString();
  }

  private async recordUsage(
    userId: string,
    organizationId: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  ): Promise<void> {
    try {
      // 토큰당 비용 계산 (예: $0.002 per 1K tokens)
      const costPerToken = 0.002 / 1000;
      const totalCost = usage.total_tokens * costPerToken;

      const usageData: UsageMetrics = {
        user_id: userId,
        organization_id: organizationId,
        tokens_used: usage.total_tokens,
        api_calls: 1,
        cost: totalCost,
        date: new Date().toISOString().split('T')[0],
      };

      await this.billingService.recordUsage(usageData);
    } catch (error) {
      // 사용량 기록 실패는 로그만 남기고 응답에는 영향 없음
      console.error('Failed to record usage:', error);
    }
  }
} 