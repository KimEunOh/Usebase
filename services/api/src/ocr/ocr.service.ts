import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdf from 'pdf-parse';

export interface TextExtractionResult {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

@Injectable()
export class OcrService {
  constructor(private readonly configService: ConfigService) {}

  async extractTextFromPdf(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const data = await pdf(buffer);
      
      return {
        text: data.text,
        pages: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords ? data.info.Keywords.split(',').map(k => k.trim()) : [],
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async preprocessText(text: string): Promise<string[]> {
    // 문단 분할 및 전처리
    const paragraphs = text
      .split(/\n\s*\n/) // 빈 줄로 문단 분할
      .map(p => p.trim())
      .filter(p => p.length > 50) // 너무 짧은 문단 제거
      .map(p => this.cleanText(p));

    return paragraphs;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .replace(/\n/g, ' ') // 줄바꿈을 공백으로
      .trim();
  }

  async extractMetadata(text: string): Promise<{
    keywords: string[];
    summary: string;
    language: string;
  }> {
    // 간단한 메타데이터 추출 (실제로는 더 정교한 NLP 사용)
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    
    // 키워드 추출 (빈도 기반)
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 3) { // 3글자 이상만
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return {
      keywords,
      summary: text.substring(0, 200) + '...',
      language: this.detectLanguage(text),
    };
  }

  private detectLanguage(text: string): string {
    // 간단한 언어 감지 (실제로는 더 정교한 라이브러리 사용)
    const koreanChars = text.match(/[가-힣]/g);
    const englishChars = text.match(/[a-zA-Z]/g);
    
    if (koreanChars && koreanChars.length > englishChars?.length) {
      return 'ko';
    }
    return 'en';
  }
} 