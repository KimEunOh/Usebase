import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Supabase mocking
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let configService: ConfigService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'https://test.supabase.co';
        case 'SUPABASE_ANON_KEY':
          return 'test-anon-key';
        default:
          return 'test-value';
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and user info on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        organization_id: 'org-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockToken = 'mock-jwt-token';

      // Mock Supabase auth response
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-id', 
            email: 'test@example.com', 
            user_metadata: { name: 'Test User' } 
          } 
        },
        error: null,
      });

      // Mock UsersService
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          organization_id: mockUser.organization_id,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        organization_id: mockUser.organization_id,
      });
    });
  });

  describe('register', () => {
    it('should create new user and return access token', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
      };

      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'user' as const,
        organization_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockToken = 'mock-jwt-token';

      // Mock Supabase auth response
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { 
          user: { 
            id: 'new-user-id', 
            email: 'new@example.com', 
            user_metadata: { name: 'New User' } 
          } 
        },
        error: null,
      });

      // Mock UsersService
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          organization_id: mockUser.organization_id,
        },
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        id: 'new-user-id',
        email: registerDto.email,
        name: registerDto.name,
        organization_id: null,
        role: 'user',
      });
    });

    it('should throw error if user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue({ 
        id: 'existing-id',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'user' as const,
        organization_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      await expect(service.register(registerDto)).rejects.toThrow('User already exists');
    });
  });
}); 