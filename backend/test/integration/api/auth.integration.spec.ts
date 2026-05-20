// Suite de integración B.1 — Autenticación end-to-end
//
// Levanta el NestJS Application completo y hace requests reales contra el
// HTTP server con Supertest. Valida:
//   - RF-01: registro de cuenta de estudiante
//   - RF-02: inicio de sesión
//   - RF-03: cierre de sesión
//   - RNF-05: contraseñas almacenadas con bcrypt (no en claro)
//
// El sandbox de LLM evita llamadas reales a OpenAI/Gemini. La DB se
// resetea con TRUNCATE CASCADE en beforeEach para idempotencia entre
// tests.

import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, extractCookies } from '../app-helpers';
import { prisma, resetDatabase } from '../db-helpers';

describe('API — Autenticación (RF-01, RF-02, RF-03, RNF-05)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // -----------------------------------------------------------------
  // RF-01 — Registro
  // -----------------------------------------------------------------

  describe('RF-01 — POST /api/auth/register', () => {
    it('should register a new student and return user + auth cookies', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Ana Estudiante',
          email: 'ana@vinki.dev',
          password: 'secret-pass-123',
        })
        .expect(201);

      expect(res.body.user).toMatchObject({
        name: 'Ana Estudiante',
        email: 'ana@vinki.dev',
        role: 'student',
      });
      expect(res.body.user.id).toBeGreaterThan(0);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const joined = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(joined).toMatch(/access_token=/);
      expect(joined).toMatch(/refresh_token=/);
    });

    it('RNF-05: should store password as bcrypt hash, not plaintext', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Bruno',
          email: 'bruno@vinki.dev',
          password: 'plain-password-99',
        })
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: 'bruno@vinki.dev' },
      });

      expect(user).not.toBeNull();
      // No se almacena en claro.
      expect(user!.passwordHash).not.toBe('plain-password-99');
      // Prefijo bcrypt y costo 10.
      expect(user!.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      // El hash debe validar con bcrypt.compare.
      const valid = await bcrypt.compare('plain-password-99', user!.passwordHash);
      expect(valid).toBe(true);
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ name: 'Carla', email: 'carla@vinki.dev', password: 'password-123' })
        .expect(201);

      await request(server)
        .post('/api/auth/register')
        .send({ name: 'Otra', email: 'carla@vinki.dev', password: 'password-456' })
        .expect(409);
    });

    it('should reject malformed email with 400 Bad Request', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ name: 'Dani', email: 'no-es-email', password: 'password-123' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should reject short password (< 8) with 400 Bad Request', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ name: 'Edu', email: 'edu@vinki.dev', password: 'short' })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------
  // RF-02 — Login
  // -----------------------------------------------------------------

  describe('RF-02 — POST /api/auth/login', () => {
    const credentials = { email: 'login@vinki.dev', password: 'login-pass-99' };

    beforeEach(async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ name: 'Loginer', ...credentials })
        .expect(201);
    });

    it('should login with valid credentials and return auth cookies', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(res.body.user.email).toBe(credentials.email);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const joined = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(joined).toMatch(/access_token=/);
      expect(joined).toMatch(/refresh_token=/);
    });

    it('should reject wrong password with 401 Unauthorized', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'wrong-password' })
        .expect(401);
    });

    it('should reject unknown email with 401 Unauthorized', async () => {
      await request(server)
        .post('/api/auth/login')
        .send({ email: 'no-existe@vinki.dev', password: 'whatever-pass' })
        .expect(401);
    });

    it('should reject malformed email with 401 (guard runs before pipe)', async () => {
      // NestJS ejecuta Guards ANTES que Pipes. `@UseGuards(AuthGuard('local'))`
      // intercepta el request antes de que el ValidationPipe vea el DTO,
      // y `LocalStrategy.validate()` simplemente no encuentra al usuario
      // ⇒ 401 Unauthorized en lugar de 400 Bad Request. Es comportamiento
      // real del sistema, no un bug. La validación estricta del email se
      // verifica en /register, que sí pasa por el pipe.
      await request(server)
        .post('/api/auth/login')
        .send({ email: 'no-es-email', password: 'whatever-pass' })
        .expect(401);
    });
  });

  // -----------------------------------------------------------------
  // RF-03 — Logout + Me (verifica cookie limpieza)
  // -----------------------------------------------------------------

  describe('RF-03 — POST /api/auth/logout y GET /api/auth/me', () => {
    it('should expose authenticated user via /me with valid access_token', async () => {
      const reg = await request(server)
        .post('/api/auth/register')
        .send({ name: 'Me User', email: 'me@vinki.dev', password: 'me-password-1' })
        .expect(201);

      const cookieHeader = extractCookies(reg.headers['set-cookie']);

      const me = await request(server)
        .get('/api/auth/me')
        .set('Cookie', cookieHeader)
        .expect(200);

      expect(me.body).toMatchObject({
        email: 'me@vinki.dev',
        name: 'Me User',
        role: 'student',
      });
    });

    it('should clear auth cookies on logout (204)', async () => {
      const reg = await request(server)
        .post('/api/auth/register')
        .send({ name: 'Lo Gout', email: 'logout@vinki.dev', password: 'logout-pass-1' })
        .expect(201);

      const cookieHeader = extractCookies(reg.headers['set-cookie']);

      const res = await request(server)
        .post('/api/auth/logout')
        .set('Cookie', cookieHeader)
        .expect(204);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const joined = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      // res.clearCookie envía cookies con Expires en el pasado o vacías.
      expect(joined).toMatch(/access_token=;/);
      expect(joined).toMatch(/refresh_token=;/);
    });

    it('should reject /me without cookies with 401 Unauthorized', async () => {
      await request(server).get('/api/auth/me').expect(401);
    });
  });
});
