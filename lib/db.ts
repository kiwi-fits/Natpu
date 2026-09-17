import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

let cachedD1Client: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  // Check for Cloudflare D1 runtime context
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare')
    const ctx = getCloudflareContext()
    if (ctx?.env?.DB) {
      if (!cachedD1Client) {
        const adapter = new PrismaD1(ctx.env.DB)
        cachedD1Client = new PrismaClient({ adapter })
      }
      return cachedD1Client
    }
  } catch {
    // Non-Cloudflare environment (local dev, migrations, or tests)
  }

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
