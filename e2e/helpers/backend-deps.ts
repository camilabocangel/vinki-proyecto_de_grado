// Resolve `@prisma/client` y `bcrypt` desde `backend/node_modules` sin
// duplicarlos en la raíz. Esto evita una segunda copia de los binarios
// nativos de bcrypt y un Prisma client generado dos veces.

import * as path from 'node:path'

const BACKEND_NODE_MODULES = path.resolve(__dirname, '..', '..', 'backend', 'node_modules')

function requireFromBackend(moduleName: string): unknown {
  const resolved = require.resolve(moduleName, { paths: [BACKEND_NODE_MODULES] })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(resolved)
}

// Tipos mínimos. Los reales viven en backend/node_modules/@prisma/client y
// no son visibles desde la raíz, pero los métodos que usa la suite están
// cubiertos por el shape declarado aquí (operaciones CRUD comunes).
type RawDelegate = {
  create: (...args: any[]) => any
  createMany?: (...args: any[]) => any
  findFirst: (...args: any[]) => any
  findUnique: (...args: any[]) => any
  findFirstOrThrow: (...args: any[]) => any
  findMany: (...args: any[]) => any
  updateMany: (...args: any[]) => any
  update: (...args: any[]) => any
  upsert?: (...args: any[]) => any
  count?: (...args: any[]) => any
}

export interface PrismaLike {
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  $executeRawUnsafe(sql: string, ...args: any[]): Promise<number>
  $queryRawUnsafe<T = any>(sql: string, ...args: any[]): Promise<T>
  user: RawDelegate
  role: RawDelegate
  language: RawDelegate
  framework: RawDelegate
  level: RawDelegate
  skill: RawDelegate
  roleLanguage: RawDelegate
  question: RawDelegate
  interview: RawDelegate
  interviewQuestion: RawDelegate
  answer: RawDelegate
  answerEvaluation: RawDelegate
  userSkillScore: RawDelegate
  knowledgeDocument: RawDelegate
  knowledgeChunk: RawDelegate
}

const prismaModule = requireFromBackend('@prisma/client') as { PrismaClient: new () => PrismaLike }
const bcryptModule = requireFromBackend('bcrypt') as {
  hash(data: string, saltRounds: number): Promise<string>
  compare(data: string, hash: string): Promise<boolean>
}

export const PrismaClient = prismaModule.PrismaClient
export const bcrypt = bcryptModule
export type PrismaClientInstance = PrismaLike
