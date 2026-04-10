import { createAuthService } from '@alesha-nov/auth'
import { type DBType } from '@alesha-nov/config'
import { createTanstackAuthHandler } from '@alesha-nov/auth-web/tanstack'

const DEFAULT_SESSION_SECRET = 'dev-session-secret-change-me'

function resolveDbType(): DBType {
  const raw = process.env.DB_TYPE?.toLowerCase()
  if (raw === 'mysql' || raw === 'postgresql' || raw === 'sqlite') return raw
  if (raw === 'postgres') return 'postgresql'
  return 'sqlite'
}

async function buildHandler() {
  const authService = await createAuthService({
    type: resolveDbType(),
    url: process.env.DATABASE_URL ?? ':memory:',
  })

  return createTanstackAuthHandler({
    authService,
    basePath: '/auth',
    secureCookie: false,
    sessionSecret: process.env.SESSION_SECRET ?? DEFAULT_SESSION_SECRET,
  })
}

let authHandlerPromise: Promise<ReturnType<typeof createTanstackAuthHandler>> | null = null

export async function getAuthHandler() {
  authHandlerPromise ??= buildHandler()
  return authHandlerPromise
}
