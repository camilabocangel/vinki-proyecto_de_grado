import { ConfigService } from '@nestjs/config';
import { JwtCookieStrategy, JwtPayload } from './jwt-cookie.strategy.js';

// JwtCookieStrategy extiende PassportStrategy(Strategy, 'jwt-cookie'). El
// constructor sólo configura el extractor (cookie `access_token`) y la
// llave pública RS256 — la verificación real de firma la hace Passport en
// tiempo de petición. Los tests aquí se enfocan en lo testeable de forma
// aislada: que el constructor lee la config y que `validate()` mapea el
// payload del JWT al objeto `req.user`.

// Una clave RSA pública válida en formato PEM (clave de prueba pública).
// No tiene que verificar nada — pasa una validación sintáctica al
// inicializar la estrategia.
const DUMMY_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxxx\\n-----END PUBLIC KEY-----';

function buildMockConfig(value: string | undefined = DUMMY_PUBLIC_KEY): ConfigService {
  return { get: jest.fn().mockReturnValue(value) } as unknown as ConfigService;
}

describe('JwtCookieStrategy', () => {
  let strategy: JwtCookieStrategy;

  beforeEach(() => {
    strategy = new JwtCookieStrategy(buildMockConfig());
  });

  describe('constructor', () => {
    it('should request the JWT_PUBLIC_KEY from config service', () => {
      const config = buildMockConfig();
      new JwtCookieStrategy(config);

      expect(config.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY');
    });
  });

  describe('validate()', () => {
    it('should map a JWT payload to the user object attached to the request', () => {
      const payload: JwtPayload = {
        sub: 42,
        email: 'student@vinki.dev',
        role: 'student',
        jti: 'token-id-123',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 42,
        email: 'student@vinki.dev',
        role: 'student',
      });
    });

    it('should preserve the role even when no jti is present in the payload', () => {
      const payload: JwtPayload = {
        sub: 7,
        email: 'admin@vinki.dev',
        role: 'admin',
      };

      const result = strategy.validate(payload);

      expect(result.role).toBe('admin');
      expect(result.userId).toBe(7);
    });
  });
});
