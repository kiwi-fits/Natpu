import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

let cachedPrisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (cachedPrisma) {
    return cachedPrisma
  }

  // 1. Direct symbol check on globalThis (OpenNext standard)
  try {
    const cfGlobal = (globalThis as any)[Symbol.for('__cloudflare-context__')]
    const dbBinding = cfGlobal?.env?.DB
    if (dbBinding) {
      const adapter = new PrismaD1(dbBinding)
      cachedPrisma = new PrismaClient({ adapter })
      return cachedPrisma
    }
  } catch {}

  // 2. getCloudflareContext helper
  try {
    const ctx = getCloudflareContext()
    const db = (ctx?.env as any)?.DB
    if (db) {
      const adapter = new PrismaD1(db)
      cachedPrisma = new PrismaClient({ adapter })
      return cachedPrisma
    }
  } catch {}

  // 3. Fallback for local development and build step
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['error'],
    })
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

