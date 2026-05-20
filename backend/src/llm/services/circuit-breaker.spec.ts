import { CircuitBreaker, CircuitState } from './circuit-breaker.js';

// El circuit breaker es código puro (sin I/O, sin DI). Estos tests cubren
// las tres transiciones de estado del patrón: CLOSED -> OPEN al alcanzar
// `failureThreshold` fallos consecutivos; OPEN -> HALF_OPEN tras
// `resetTimeoutMs`; HALF_OPEN -> CLOSED (recuperación) u OPEN (recaída).

describe('CircuitBreaker', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker({ name: 'test' });
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should pass through the result of the executed function when CLOSED', async () => {
    const cb = new CircuitBreaker({ name: 'test' });
    const result = await cb.exec(async () => 42);
    expect(result).toBe(42);
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should remain CLOSED while failures stay under the threshold', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3 });

    await expect(cb.exec(async () => { throw new Error('fail-1'); })).rejects.toThrow('fail-1');
    await expect(cb.exec(async () => { throw new Error('fail-2'); })).rejects.toThrow('fail-2');

    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should open the circuit when failures reach the configured threshold', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await expect(cb.exec(async () => { throw new Error('boom'); })).rejects.toThrow();
    }

    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('should short-circuit subsequent calls while OPEN', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 60_000,
    });
    await expect(cb.exec(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(cb.getState()).toBe(CircuitState.OPEN);

    // Ahora la siguiente llamada NO ejecuta la función: corto-circuita.
    const inner = jest.fn();
    await expect(cb.exec(async () => { inner(); })).rejects.toThrow(/is OPEN/);
    expect(inner).not.toHaveBeenCalled();
  });

  it('should transition to HALF_OPEN after resetTimeoutMs and allow one trial', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 50, // 50 ms para que el test sea rápido
    });

    await expect(cb.exec(async () => { throw new Error('boom'); })).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    await new Promise((r) => setTimeout(r, 60));

    // La siguiente llamada pasa a HALF_OPEN y, si tiene éxito, cierra.
    const result = await cb.exec(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should re-open immediately if the HALF_OPEN probe fails', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 50,
    });

    await expect(cb.exec(async () => { throw new Error('boom-1'); })).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 60));

    // En HALF_OPEN un fallo regresa a OPEN.
    await expect(cb.exec(async () => { throw new Error('boom-2'); })).rejects.toThrow('boom-2');
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('should reset the failure counter on a successful call', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3 });

    await expect(cb.exec(async () => { throw new Error('f1'); })).rejects.toThrow();
    await expect(cb.exec(async () => { throw new Error('f2'); })).rejects.toThrow();
    // 2 fallos seguidos y luego un éxito.
    await cb.exec(async () => 'ok');
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    // Tras el reset, hacen falta otros 3 fallos para abrir.
    await expect(cb.exec(async () => { throw new Error('f3'); })).rejects.toThrow();
    await expect(cb.exec(async () => { throw new Error('f4'); })).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });
});
