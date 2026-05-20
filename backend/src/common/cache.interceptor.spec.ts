import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import {
  CacheInterceptor,
  Cacheable,
  InvalidateCache,
  CACHE_TTL_KEY,
  INVALIDATE_CACHE_KEY,
} from './cache.interceptor.js';
import { RedisService } from './redis.service.js';

interface RequestLike {
  method: string;
  url: string;
  user?: { userId: number };
}

function buildContext(
  request: RequestLike = { method: 'GET', url: '/x' },
): ExecutionContext {
  return {
    getHandler: jest.fn(() => () => undefined),
    getClass: jest.fn(() => class {}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function buildNext(value: unknown): CallHandler {
  return { handle: jest.fn(() => of(value)) };
}

describe('@Cacheable() decorator', () => {
  it('should set CACHE_TTL_KEY metadata with the TTL value', () => {
    class Target { @Cacheable(300) m() {} }
    const meta = Reflect.getMetadata(CACHE_TTL_KEY, Target.prototype.m);
    expect(meta).toBe(300);
  });
});

describe('@InvalidateCache() decorator', () => {
  it('should set INVALIDATE_CACHE_KEY metadata with the pattern', () => {
    class Target { @InvalidateCache('cache:GET:/x*') m() {} }
    const meta = Reflect.getMetadata(INVALIDATE_CACHE_KEY, Target.prototype.m);
    expect(meta).toBe('cache:GET:/x*');
  });
});

describe('CacheInterceptor', () => {
  let reflector: Reflector;
  let redis: jest.Mocked<RedisService>;
  let interceptor: CacheInterceptor;

  beforeEach(() => {
    reflector = new Reflector();
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RedisService>;
    interceptor = new CacheInterceptor(reflector, redis);
  });

  describe('cache invalidation path', () => {
    it('should call redis.del with the pattern and then continue to the handler', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) =>
          key === INVALIDATE_CACHE_KEY ? 'cache:GET:/x*' : undefined,
        ) as any;

      const ctx = buildContext();
      const next = buildNext({ ok: true });

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(redis.del).toHaveBeenCalledWith('cache:GET:/x*');
      expect(next.handle).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should swallow del() errors without aborting the handler', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) =>
          key === INVALIDATE_CACHE_KEY ? 'cache:*' : undefined,
        ) as any;
      redis.del.mockRejectedValue(new Error('redis down'));

      const ctx = buildContext();
      const next = buildNext({ ok: true });

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(result).toEqual({ ok: true });
    });
  });

  describe('cacheable path', () => {
    it('should bypass interception when no TTL metadata is set', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined as any);

      const ctx = buildContext();
      const next = buildNext('handler-result');

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(next.handle).toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();
      expect(result).toBe('handler-result');
    });

    it('cache HIT: should return parsed cached value and SKIP the handler', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 300 : undefined)) as any;
      redis.get.mockResolvedValue(JSON.stringify({ from: 'cache' }));

      // Sin `user` en la request → catálogo público → cae al sufijo `:u:anon`.
      const ctx = buildContext({ method: 'GET', url: '/catalogs/languages' });
      const next = buildNext('handler-not-called');

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(redis.get).toHaveBeenCalledWith('cache:GET:/catalogs/languages:u:anon');
      expect(next.handle).not.toHaveBeenCalled();
      expect(result).toEqual({ from: 'cache' });
    });

    it('cache MISS: should call the handler and persist the result via redis.set with the TTL', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 300 : undefined)) as any;
      redis.get.mockResolvedValue(null);

      const ctx = buildContext({ method: 'GET', url: '/catalogs/levels' });
      const next = buildNext([{ id: 1, name: 'Junior' }]);

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(next.handle).toHaveBeenCalled();
      // El tap del set ocurre tras emitir el valor; al esperar lastValueFrom
      // ya pasó. El sufijo `:u:anon` aparece porque no hubo `req.user`.
      expect(redis.set).toHaveBeenCalledWith(
        'cache:GET:/catalogs/levels:u:anon',
        JSON.stringify([{ id: 1, name: 'Junior' }]),
        300,
      );
      expect(result).toEqual([{ id: 1, name: 'Junior' }]);
    });

    it('should still call the handler if redis.get fails (degraded mode)', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 60 : undefined)) as any;
      redis.get.mockRejectedValue(new Error('connection refused'));

      const ctx = buildContext();
      const next = buildNext('from-handler');

      const obs$ = await interceptor.intercept(ctx, next);
      const result = await lastValueFrom(obs$);

      expect(next.handle).toHaveBeenCalled();
      expect(result).toBe('from-handler');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Regression guards — Bug HE-01 (cross-tenant data leak en caché)
  //
  // Estos tests fijan a nivel unitario el contrato del cache key:
  // debe incluir el userId del request autenticado para que dos
  // usuarios distintos NUNCA compartan la misma entrada en Redis.
  // Si alguien regresiona `buildCacheKey()` quitando el `:u:userId`,
  // estos tests rompen ANTES de que el bug llegue a producción.
  // ──────────────────────────────────────────────────────────────────
  describe('cache key — regression guards HE-01', () => {
    it('should generate different cache keys for different authenticated users on the same endpoint', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 60 : undefined)) as any;
      redis.get.mockResolvedValue(null);

      // Usuario A: userId=1, GET /dashboard.
      const ctxA = buildContext({
        method: 'GET',
        url: '/dashboard',
        user: { userId: 1 },
      });
      const nextA = buildNext({ owner: 'A' });
      const obsA$ = await interceptor.intercept(ctxA, nextA);
      await lastValueFrom(obsA$);

      // Usuario B: userId=42, MISMA URL.
      const ctxB = buildContext({
        method: 'GET',
        url: '/dashboard',
        user: { userId: 42 },
      });
      const nextB = buildNext({ owner: 'B' });
      const obsB$ = await interceptor.intercept(ctxB, nextB);
      await lastValueFrom(obsB$);

      // El interceptor consultó Redis con DOS claves distintas:
      const getKeys = redis.get.mock.calls.map((c) => c[0]);
      expect(getKeys).toContain('cache:GET:/dashboard:u:1');
      expect(getKeys).toContain('cache:GET:/dashboard:u:42');
      expect(getKeys[0]).not.toBe(getKeys[1]);

      // Y persistió cada respuesta bajo su propia clave per-user:
      const setKeys = redis.set.mock.calls.map((c) => c[0]);
      expect(setKeys).toContain('cache:GET:/dashboard:u:1');
      expect(setKeys).toContain('cache:GET:/dashboard:u:42');
    });

    it('should NOT leak User A response to User B when User B hits the same endpoint after a cache HIT for A', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 60 : undefined)) as any;

      // Redis tiene cacheada la respuesta de A pero NO la de B.
      redis.get.mockImplementation(async (key: string) => {
        if (key === 'cache:GET:/dashboard:u:1') {
          return JSON.stringify({ owner: 'A', recentInterviews: [{ id: 99 }] });
        }
        return null;
      });

      // B pide su dashboard.
      const ctxB = buildContext({
        method: 'GET',
        url: '/dashboard',
        user: { userId: 2 },
      });
      const nextB = buildNext({ owner: 'B-from-handler', recentInterviews: [] });
      const obsB$ = await interceptor.intercept(ctxB, nextB);
      const result = await lastValueFrom(obsB$);

      // B recibe su PROPIA respuesta (del handler), NUNCA la de A.
      expect(result).toEqual({ owner: 'B-from-handler', recentInterviews: [] });
      expect(nextB.handle).toHaveBeenCalled();
      // El interceptor consultó la clave per-user de B, NO la de A.
      expect(redis.get).toHaveBeenCalledWith('cache:GET:/dashboard:u:2');
    });

    it("should use 'anon' in cache key for unauthenticated requests (public catalog endpoints)", async () => {
      jest
        .spyOn(reflector, 'get')
        .mockImplementation((key) => (key === CACHE_TTL_KEY ? 300 : undefined)) as any;
      redis.get.mockResolvedValue(null);

      // Request sin `user` — endpoint público (catálogos).
      const ctx = buildContext({ method: 'GET', url: '/catalogs/roles' });
      const next = buildNext([{ id: 1, name: 'Backend' }]);
      const obs$ = await interceptor.intercept(ctx, next);
      await lastValueFrom(obs$);

      // La clave usa `:u:anon` → todos los visitantes anónimos comparten
      // la misma entrada de cache para catálogos globales.
      expect(redis.get).toHaveBeenCalledWith('cache:GET:/catalogs/roles:u:anon');
      expect(redis.set).toHaveBeenCalledWith(
        'cache:GET:/catalogs/roles:u:anon',
        JSON.stringify([{ id: 1, name: 'Backend' }]),
        300,
      );
    });
  });
});
