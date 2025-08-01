import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@shared/types';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_ANON_KEY'),
    );
  }

  async validateUser(email: string, password: string): Promise<User> {
    // 개발 환경에서 테스트 계정 허용
    if (process.env.NODE_ENV === 'development') {
      if (email === 'test@usebase.com' && password === 'test1234') {
                 return {
           id: 'test-user-id',
           email: 'test@usebase.com',
           name: '테스트 사용자',
           organization_id: 'test-org-001',
           role: 'admin',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
         };
      }
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 사용자 정보를 데이터베이스에서 가져오거나 생성
    let user = await this.usersService.findByEmail(data.user.email);
    
    if (!user) {
      // 새 사용자 생성
      user = await this.usersService.create({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split('@')[0],
        organization_id: null, // 조직은 별도로 설정
        role: 'user',
      });
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // 개발 환경에서 테스트 계정 허용
    if (process.env.NODE_ENV === 'development' && 
        registerDto.email === 'test@usebase.com') {
             const user = {
         id: 'test-user-id',
         email: 'test@usebase.com',
         name: registerDto.name || '테스트 사용자',
         organization_id: 'test-org-001',
         role: 'admin',
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
       };

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization_id: user.organization_id,
        },
      };
    }

    // 이메일 중복 확인
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Supabase Auth에 사용자 생성
    const { data, error } = await this.supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
      options: {
        data: {
          name: registerDto.name,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Failed to create user');
    }

    // 데이터베이스에 사용자 정보 저장
    const user = await this.usersService.create({
      id: data.user.id,
      email: registerDto.email,
      name: registerDto.name,
      organization_id: null,
      role: 'user',
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
      },
    };
  }

  async logout(userId: string) {
    // Supabase에서 로그아웃
    await this.supabase.auth.signOut();
    
    // 필요시 토큰 블랙리스트 처리
    return { message: 'Logged out successfully' };
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
} 