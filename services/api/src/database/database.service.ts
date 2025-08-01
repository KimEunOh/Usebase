import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // 연결 테스트
    try {
      const { data, error } = await this.supabase.from('health_check').select('*').limit(1);
      if (error && error.code !== 'PGRST116') { // 테이블이 없는 경우는 무시
        console.error('Supabase connection error:', error);
      } else {
        console.log('✅ Supabase connected successfully');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async healthCheck() {
    try {
      const { data, error } = await this.supabase.from('health_check').select('*').limit(1);
      return { status: 'ok', error: error?.message };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      // Supabase에서는 raw SQL 쿼리를 직접 지원하지 않으므로
      // 간단한 구현으로 대체 (실제로는 Supabase의 RPC 함수 사용 권장)
      console.warn('Raw SQL queries are not fully supported in Supabase. Consider using RPC functions.');
      
      // 개발 환경에서는 모의 데이터 반환
      if (process.env.NODE_ENV === 'development') {
        return this.getMockData(sql);
      }
      
      throw new Error('Raw SQL queries not implemented for Supabase');
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  private getMockData(sql: string): any[] {
    // 사용량 메트릭 관련 모의 데이터
    if (sql.includes('usage_metrics')) {
      return [
        {
          total_tokens: '1000',
          total_cost: '3.0',
          total_api_calls: '10',
          month: '2024-01-01',
          monthly_tokens: '1000',
          monthly_cost: '3.0',
          monthly_api_calls: '10',
        },
      ];
    }
    return [];
  }
} 