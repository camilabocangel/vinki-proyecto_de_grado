// Mock del PrismaClient antes de cargar el servicio: PrismaService
// extiende PrismaClient e invoca $connect/$disconnect en los hooks de
// ciclo de vida de Nest. Aquí sólo se verifica que esos hooks delegan al
// cliente, sin abrir una conexión real.
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('@prisma/client', () => ({
  PrismaClient: class FakePrismaClient {
    $connect = mockConnect;
    $disconnect = mockDisconnect;
  },
}));

import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    service = new PrismaService();
  });

  it('should call $connect on module init', async () => {
    await service.onModuleInit();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should call $disconnect on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
