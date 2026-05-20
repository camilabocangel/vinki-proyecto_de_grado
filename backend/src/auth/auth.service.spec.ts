import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  role: 'student',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('7d'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should create a user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          passwordHash: 'hashed-password',
        },
      });
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens for valid user', async () => {
      const result = await service.login(mockUser as any);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
    });
  });

  describe('generateTokens', () => {
    it('should sign access token with payload that includes sub, email, role, and jti', () => {
      service.generateTokens(mockUser as any);

      // El primer sign() es el access token: lleva el payload completo sin
      // opciones de expiración personalizadas (usa la del módulo JWT).
      const firstCall = jwtService.sign.mock.calls[0];
      expect(firstCall[0]).toEqual({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        jti: 'mock-uuid',
      });
      // El access token NO recibe un override de `expiresIn`.
      expect(firstCall[1]).toBeUndefined();
    });

    it('should sign refresh token with JWT_REFRESH_EXPIRATION from config', () => {
      service.generateTokens(mockUser as any);

      // Segundo sign(): refresh token, con override de expiresIn = '7d' (mock).
      const secondCall = jwtService.sign.mock.calls[1];
      expect(secondCall[0]).toMatchObject({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(secondCall[1]).toEqual({ expiresIn: '7d' });
    });
  });

  describe('refreshFromToken', () => {
    it('should issue new tokens when refresh token verifies and user exists', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshFromToken('valid-refresh-token');

      // verify() se llamó con algoritmo RS256 (alineado con la config del módulo JWT).
      expect(jwtService.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        expect.objectContaining({ algorithms: ['RS256'] }),
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      // Se firman dos nuevos tokens (rotación).
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        user: { id: mockUser.id, email: mockUser.email, role: mockUser.role },
      });
    });

    it('should throw UnauthorizedException when refresh token is malformed or expired', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refreshFromToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the user from payload no longer exists', async () => {
      jwtService.verify.mockReturnValue({ sub: 999 });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshFromToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      // jwtService.sign NO debe haberse llamado: no se emiten tokens si el
      // usuario fue eliminado.
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update name only', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, { name: 'Updated Name' });

      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update email after checking uniqueness', async () => {
      const updatedUser = { ...mockUser, email: 'new@example.com' };
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, {
        email: 'new@example.com',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'new@example.com', id: { not: 1 } },
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 2,
        email: 'taken@example.com',
      });

      await expect(
        service.updateProfile(1, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'old-password',
      newPassword: 'new-password123',
    };

    it('should change password when current password is valid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.changePassword(1, changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'old-password',
        mockUser.passwordHash,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { passwordHash: 'new-hashed-password' },
      });
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(999, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
