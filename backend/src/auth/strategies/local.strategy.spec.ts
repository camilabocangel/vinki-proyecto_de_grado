// `uuid` v13 es ESM y Jest no lo transforma; AuthService lo importa
// transitivamente (vía LocalStrategy -> AuthService). Mockeado antes del
// import del strategy para evitar SyntaxError en runtime.
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy.js';
import { AuthService } from '../auth.service.js';

describe('LocalStrategy', () => {
  let authService: jest.Mocked<Pick<AuthService, 'validateUser'>>;
  let strategy: LocalStrategy;

  beforeEach(() => {
    authService = {
      validateUser: jest.fn(),
    };
    strategy = new LocalStrategy(authService as unknown as AuthService);
  });

  it('should return the user when authService.validateUser succeeds', async () => {
    const user = { id: 1, email: 'test@example.com', role: 'student' };
    authService.validateUser.mockResolvedValue(user as any);

    const result = await strategy.validate('test@example.com', 'password123');

    expect(authService.validateUser).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
    expect(result).toEqual(user);
  });

  it('should throw UnauthorizedException when authService.validateUser returns null', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      strategy.validate('test@example.com', 'wrong'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
