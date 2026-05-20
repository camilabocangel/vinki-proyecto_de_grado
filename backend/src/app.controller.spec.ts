// Smoke test del backend.
//
// Verifica que el pipeline Jest + ts-jest está operativo y que el setup
// global (`test/setup.ts`) se cargó correctamente. Deliberadamente NO
// instancia módulos de NestJS para evitar cargar el árbol completo de
// providers en cada arranque de worker (Windows + ts-jest es propenso a
// OOM con módulos pesados); la verificación a nivel de módulos NestJS se
// hace en los .spec.ts específicos de cada servicio.

describe('Backend — smoke', () => {
  it('el pipeline Jest + ts-jest está operativo', () => {
    expect(2 + 2).toBe(4);
  });

  it('el setup global (test/setup.ts) se cargó', () => {
    expect(process.env.JEST_SETUP_LOADED).toBe('1');
  });

  it('TypeScript con tipos estrictos se transforma correctamente', () => {
    const greet = (name: string): string => `Hello, ${name}`;
    expect(greet('Vinki')).toBe('Hello, Vinki');
  });
});
