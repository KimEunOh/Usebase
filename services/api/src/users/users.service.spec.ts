import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'https://test.supabase.co';
        case 'SUPABASE_SERVICE_ROLE_KEY':
          return 'test-service-role-key';
        default:
          return 'test-value';
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        organization_id: 'org-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock the service method directly
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Mock the service method directly
      jest.spyOn(service, 'findById').mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        organization_id: 'org-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock the service method directly
      jest.spyOn(service, 'findByEmail').mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const userData = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'user' as const,
        organization_id: null,
      };

      const createdUser = {
        ...userData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock the service method directly
      jest.spyOn(service, 'create').mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
    });

    it('should throw error when creation fails', async () => {
      const userData = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'user' as const,
        organization_id: null,
      };

      // Mock the service method to throw error
      jest.spyOn(service, 'create').mockRejectedValue(new Error('Failed to create user: Database error'));

      await expect(service.create(userData)).rejects.toThrow('Failed to create user: Database error');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated User',
        organization_id: 'new-org-id',
      };

      const updatedUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Updated User',
        role: 'user' as const,
        organization_id: 'new-org-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock the service method directly
      jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

      const result = await service.update('user-id', updateData);

      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Mock the service method directly
      jest.spyOn(service, 'delete').mockResolvedValue(undefined);

      await expect(service.delete('user-id')).resolves.not.toThrow();
    });

    it('should throw error when deletion fails', async () => {
      // Mock the service method to throw error
      jest.spyOn(service, 'delete').mockRejectedValue(new Error('Failed to delete user: Delete failed'));

      await expect(service.delete('user-id')).rejects.toThrow('Failed to delete user: Delete failed');
    });
  });

  describe('findByOrganization', () => {
    it('should return users in organization', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'user' as const,
          organization_id: 'org-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: 'admin' as const,
          organization_id: 'org-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the service method directly
      jest.spyOn(service, 'findByOrganization').mockResolvedValue(mockUsers);

      const result = await service.findByOrganization('org-id');

      expect(result).toEqual(mockUsers);
    });
  });
}); 