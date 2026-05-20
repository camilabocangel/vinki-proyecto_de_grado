// `uuid` v13 es un paquete ESM puro; Jest no lo transforma por defecto y
// AuthService lo importa transitivamente. Se mockea antes del import del
// controller (mismo patrón que auth.service.spec.ts).
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CanActivate } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuditService } from '../common/audit.service.js';
import { JwtCookieGuard } from './guards/jwt-cookie.guard.js';

// Tipo mínimo de Response para los tests — sólo expone los métodos usados.
type MockResponse = {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
};

function createMockResponse(): MockResponse {
  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  } as MockResponse;
  res.status.mockReturnValue(res); // permite encadenar .status().json()
  res.json.mockReturnValue(res);
  return res;
}

const mockUserResponse = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'student' as const,
  createdAt: new Date('2026-01-01'),
};

const mockTokenResult = {
  accessToken: 'access-jwt',
  refreshToken: 'refresh-jwt',
  user: mockUserResponse,
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshFromToken: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  // AuthGuard('local') es una clase generada dinámicamente; aquí se reemplaza
  // por un guard pasa-todo para que el controller invoque login() sin pasar
  // por Passport real (que requeriría una estrategia y el flujo HTTP completo).
  const AllowAllGuard: CanActivate = {
    canActivate: (_: ExecutionContext) => true,
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshFromToken: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuditService, useValue: auditService },
      ],
    })
      .overrideGuard(AuthGuard('local'))
      .useValue(AllowAllGuard)
      .overrideGuard(JwtCookieGuard)
      .useValue(AllowAllGuard)
      .compile();

    controller = moduleRef.get(AuthController);
  });

  describe('POST /auth/register', () => {
    it('should call authService.register, set cookies, audit and return the user', async () => {
      authService.register.mockResolvedValue(mockTokenResult);
      const res = createMockResponse();
      const dto = { name: 'Test User', email: 'test@example.com', password: 'password123' };

      const result = await controller.register(dto, res as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      // Dos cookies emitidas (access_token + refresh_token).
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenNthCalledWith(
        1,
        'access_token',
        'access-jwt',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(res.cookie).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        'refresh-jwt',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        mockUserResponse.id,
        'register',
        'user',
        mockUserResponse.id,
      );
      expect(result).toEqual({ user: mockUserResponse });
    });

    it('should set secure cookies when NODE_ENV is production', async () => {
      const previousEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        authService.register.mockResolvedValue(mockTokenResult);
        const res = createMockResponse();

        await controller.register(
          { name: 'N', email: 'e@x.com', password: 'p12345678' },
          res as any,
        );

        const accessCookieOpts = res.cookie.mock.calls[0][2];
        const refreshCookieOpts = res.cookie.mock.calls[1][2];
        expect(accessCookieOpts.secure).toBe(true);
        expect(refreshCookieOpts.secure).toBe(true);
      } finally {
        process.env.NODE_ENV = previousEnv;
      }
    });

    it('should propagate errors from authService.register without setting cookies', async () => {
      const boom = new Error('Email already registered');
      authService.register.mockRejectedValue(boom);
      const res = createMockResponse();

      await expect(
        controller.register(
          { name: 'N', email: 'e@x.com', password: 'p12345678' },
          res as any,
        ),
      ).rejects.toThrow(boom);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('should call authService.login with the validated user from req.user and set cookies', async () => {
      authService.login.mockResolvedValue(mockTokenResult);
      const res = createMockResponse();
      const req = { user: { id: 1, email: 'test@example.com' } } as any;

      const result = await controller.login(req, res as any);

      expect(authService.login).toHaveBeenCalledWith(req.user);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(auditService.log).toHaveBeenCalledWith(
        mockUserResponse.id,
        'login',
        'user',
        mockUserResponse.id,
      );
      expect(result).toEqual({ user: mockUserResponse });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should issue 401 when there is no refresh_token cookie', async () => {
      const res = createMockResponse();
      const req = { cookies: {} } as any;

      const result = await controller.refresh(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No refresh token' });
      expect(authService.refreshFromToken).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should refresh tokens when a valid refresh_token cookie is present', async () => {
      authService.refreshFromToken.mockResolvedValue(mockTokenResult);
      const res = createMockResponse();
      const req = { cookies: { refresh_token: 'cookie-refresh' } } as any;

      const result = await controller.refresh(req, res as any);

      expect(authService.refreshFromToken).toHaveBeenCalledWith('cookie-refresh');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ user: mockUserResponse });
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear both auth cookies', () => {
      const res = createMockResponse();

      controller.logout(res as any);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('GET /auth/me', () => {
    it('should delegate to authService.getProfile with userId from request', async () => {
      authService.getProfile.mockResolvedValue(mockUserResponse);
      const req = { user: { userId: 42 } } as any;

      const result = await controller.me(req);

      expect(authService.getProfile).toHaveBeenCalledWith(42);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should delegate to authService.updateProfile with userId and DTO', async () => {
      const updated = { ...mockUserResponse, name: 'New' };
      authService.updateProfile.mockResolvedValue(updated);
      const req = { user: { userId: 7 } } as any;
      const dto = { name: 'New' };

      const result = await controller.updateProfile(req, dto);

      expect(authService.updateProfile).toHaveBeenCalledWith(7, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should delegate to authService.changePassword with userId and DTO', async () => {
      authService.changePassword.mockResolvedValue(undefined);
      const req = { user: { userId: 7 } } as any;
      const dto = { currentPassword: 'old', newPassword: 'new-password-12' };

      const result = await controller.changePassword(req, dto);

      expect(authService.changePassword).toHaveBeenCalledWith(7, dto);
      expect(result).toBeUndefined();
    });
  });
});
