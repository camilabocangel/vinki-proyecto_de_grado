import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service.js';

export const CACHE_TTL_KEY = 'cache_ttl';
export const INVALIDATE_CACHE_KEY = 'invalidate_cache_pattern';

/**
 * Decorator to cache the response of a controller method.
 * @param ttlSeconds Time-to-live in seconds for the cached response.
 */
export const Cacheable = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * Decorator to invalidate cache entries matching a glob pattern.
 * @param pattern Redis key glob pattern, e.g. "cache:GET:/catalogs/*"
 */
export const InvalidateCache = (pattern: string) =>
  SetMetadata(INVALIDATE_CACHE_KEY, pattern);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Handle cache invalidation
    const invalidatePattern = this.reflector.get<string>(
      INVALIDATE_CACHE_KEY,
      context.getHandler(),
    );
    if (invalidatePattern) {
      await this.redisService.del(invalidatePattern).catch((err) =>
        this.logger.warn(`Cache invalidation failed: ${err.message}`),
      );
      return next.handle();
    }

    // Handle cacheable responses
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    if (!ttl) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.buildCacheKey(request);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return of(JSON.parse(cached));
      }
    } catch (err) {
      this.logger.warn(`Cache read failed: ${(err as Error).message}`);
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(response), ttl);
        } catch (err) {
          this.logger.warn(`Cache write failed: ${(err as Error).message}`);
        }
      }),
    );
  }

  private buildCacheKey(request: any): string {
    const method = request.method;
    const url = request.originalUrl || request.url;
    // RNF-07 / Bug HE-01: incluir el userId del request autenticado en la
    // clave evita cache poisoning cross-user. Endpoints sin autenticación
    // (catálogos públicos) caen al sufijo 'anon' y comparten cache como
    // antes. `JwtCookieStrategy.validate()` deja `userId` en `req.user`.
    const userId = request.user?.userId ?? 'anon';
    return `cache:${method}:${url}:u:${userId}`;
  }
}
