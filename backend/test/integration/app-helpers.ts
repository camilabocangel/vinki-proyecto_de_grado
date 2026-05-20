// Helper para levantar la aplicación NestJS real en las pruebas de
// integración del Grupo B (API end-to-end con Supertest).
//
// Configura el módulo completo igual que en `main.ts`:
//   - Prefijo global `/api`
//   - cookie-parser para JWT en cookies
//   - ValidationPipe global con whitelist/forbidNonWhitelisted/transform
//   - GlobalExceptionFilter
//
// `LLM_SANDBOX=true` en `.env.test` hace que los providers de LLM y
// embeddings sean los Mock — cero llamadas reales a OpenAI/Gemini.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter.js';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });

  // Mismo pipeline que main.ts (sin helmet, irrelevante para tests).
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  return app;
}

/**
 * Login helper: hace POST /api/auth/login y devuelve el header Cookie
 * listo para reutilizar en requests posteriores.
 */
export function extractCookies(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return cookies
    .map((c) => c.split(';')[0])
    .join('; ');
}
