import { AuthGuard } from '@nestjs/passport';
import { JwtCookieGuard } from './jwt-cookie.guard.js';

// JwtCookieGuard es un wrapper trivial sobre `AuthGuard('jwt-cookie')`. La
// lógica real (extracción del JWT desde la cookie, verificación de firma)
// vive en `JwtCookieStrategy`. Aquí se valida lo único propio del guard:
// que sea instanciable y que herede de la AuthGuard de Passport ligada al
// nombre de estrategia 'jwt-cookie'.

describe('JwtCookieGuard', () => {
  it('should instantiate without throwing', () => {
    expect(() => new JwtCookieGuard()).not.toThrow();
  });

  it('should extend the Passport AuthGuard bound to the "jwt-cookie" strategy', () => {
    const ExpectedBase = AuthGuard('jwt-cookie');
    expect(new JwtCookieGuard()).toBeInstanceOf(ExpectedBase);
  });
});
