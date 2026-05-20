// Helper para mockear PrismaClient/PrismaService en pruebas unitarias.
//
// Uso típico en un test unitario:
//
//   import { createPrismaMock } from '../../test/prisma.mock';
//   import { Test } from '@nestjs/testing';
//   import { PrismaService } from '../common/prisma.service';
//   import { MyService } from './my.service';
//
//   const prisma = createPrismaMock();
//   const moduleRef = await Test.createTestingModule({
//     providers: [MyService, { provide: PrismaService, useValue: prisma }],
//   }).compile();
//
// Cualquier acceso del tipo `prisma.user.findUnique(...)` devolverá un
// `jest.fn()` reutilizable que puede configurarse con `mockResolvedValue` u
// otros helpers de Jest.
//
// Las pruebas de **integración** (Fase 4) NO deben usar este mock: deben
// recibir una instancia real de PrismaClient apuntando a la base de pruebas.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PrismaMock = Record<string, any>;

export function createPrismaMock(): PrismaMock {
  const modelHandler: ProxyHandler<Record<string, any>> = {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!(prop in target)) {
        target[prop] = jest.fn();
      }
      return target[prop];
    },
  };

  const rootHandler: ProxyHandler<Record<string, any>> = {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      if (prop.startsWith('$')) {
        target[prop] = jest.fn();
        return target[prop];
      }
      target[prop] = new Proxy({}, modelHandler);
      return target[prop];
    },
  };

  return new Proxy({} as Record<string, any>, rootHandler);
}
