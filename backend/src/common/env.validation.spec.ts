// `class-validator` y `class-transformer` dependen de `reflect-metadata`.
// Otros specs lo cargan transitivamente vía NestJS, pero este spec usa
// `validate()` directamente; se importa aquí para que las decoraciones
// de la clase `EnvironmentVariables` queden registradas en el runtime.
import 'reflect-metadata';
import { validate } from './env.validation.js';

// `validate` se ejecuta cuando arranca el ConfigModule. Debe rechazar
// configuraciones inválidas (variables obligatorias faltantes) y aceptar
// las válidas. Cubre los caminos del decorador `IsNotEmpty` sobre las
// variables críticas (DATABASE_URL, REDIS_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY).

const VALID_CONFIG = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_PRIVATE_KEY: 'fake-private-key',
  JWT_PUBLIC_KEY: 'fake-public-key',
};

describe('env.validation — validate()', () => {
  it('should accept a complete and valid configuration', () => {
    const result = validate(VALID_CONFIG);

    expect(result.DATABASE_URL).toBe(VALID_CONFIG.DATABASE_URL);
    expect(result.REDIS_URL).toBe(VALID_CONFIG.REDIS_URL);
    expect(result.NODE_ENV).toBe('development');
  });

  it('should accept optional variables when omitted', () => {
    // JWT_ACCESS_EXPIRATION, OPENAI_API_KEY, AWS_*, FRONTEND_URL son opcionales.
    expect(() => validate(VALID_CONFIG)).not.toThrow();
  });

  it('should throw when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _omit, ...config } = VALID_CONFIG;
    void _omit;

    expect(() => validate(config)).toThrow();
  });

  it('should throw when REDIS_URL is missing', () => {
    const { REDIS_URL: _omit, ...config } = VALID_CONFIG;
    void _omit;

    expect(() => validate(config)).toThrow();
  });

  it('should throw when JWT_PRIVATE_KEY is missing', () => {
    const { JWT_PRIVATE_KEY: _omit, ...config } = VALID_CONFIG;
    void _omit;

    expect(() => validate(config)).toThrow();
  });

  it('should throw when JWT_PUBLIC_KEY is missing', () => {
    const { JWT_PUBLIC_KEY: _omit, ...config } = VALID_CONFIG;
    void _omit;

    expect(() => validate(config)).toThrow();
  });

  it('should throw when NODE_ENV is not one of (development|production|test)', () => {
    expect(() =>
      validate({ ...VALID_CONFIG, NODE_ENV: 'staging' }),
    ).toThrow();
  });

  it('should accept NODE_ENV="production"', () => {
    expect(() => validate({ ...VALID_CONFIG, NODE_ENV: 'production' })).not.toThrow();
  });

  it('should accept NODE_ENV="test"', () => {
    expect(() => validate({ ...VALID_CONFIG, NODE_ENV: 'test' })).not.toThrow();
  });

  it('should accept optional FRONTEND_URL when provided as a string', () => {
    const config = { ...VALID_CONFIG, FRONTEND_URL: 'http://localhost:5173' };

    expect(() => validate(config)).not.toThrow();
  });
});
