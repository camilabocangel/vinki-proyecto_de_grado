import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY, Roles } from './roles.decorator.js';

// Construye un ExecutionContext mínimo con el `user` simulado en la request.
function ctxWithUser(user: unknown): ExecutionContext {
  return {
    getHandler: jest.fn(() => () => undefined),
    getClass: jest.fn(() => class {}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no @Roles metadata is declared on the route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined as any);

    const result = guard.canActivate(ctxWithUser({ role: 'student' }));

    expect(result).toBe(true);
  });

  it("should allow access when the user's role is included in the required roles", () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['student', 'admin']);

    const result = guard.canActivate(ctxWithUser({ role: 'admin' }));

    expect(result).toBe(true);
  });

  it("should deny access when the user's role is not in the required roles", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const result = guard.canActivate(ctxWithUser({ role: 'student' }));

    expect(result).toBe(false);
  });
});

describe('Roles() decorator', () => {
  it("should set metadata under ROLES_KEY with the given roles", () => {
    class TargetClass {}
    Roles('admin', 'recruiter')(TargetClass);

    const metadata = Reflect.getMetadata(ROLES_KEY, TargetClass);
    expect(metadata).toEqual(['admin', 'recruiter']);
  });

  it('should accept zero roles (decorator usable as a marker)', () => {
    class TargetClass {}
    Roles()(TargetClass);

    expect(Reflect.getMetadata(ROLES_KEY, TargetClass)).toEqual([]);
  });
});
