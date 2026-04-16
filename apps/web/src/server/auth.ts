import { createAuthService } from '@alesha-nov/auth'
import { getSessionFromRequest, type AuthSession } from '@alesha-nov/auth-web'
import { createTanstackAuthHandler } from '@alesha-nov/auth-web/tanstack'
import { resolveSecureCookie, resolveSessionSecret } from './auth-config'

function resolveDbType(): 'mysql' | 'postgresql' | 'sqlite' {
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
    secureCookie: resolveSecureCookie(),
    sessionSecret: resolveSessionSecret(),
  })
}

let authHandlerPromise: Promise<ReturnType<typeof createTanstackAuthHandler>> | null = null

export async function getAuthHandler() {
  authHandlerPromise ??= buildHandler()
  return authHandlerPromise
}

export async function getServerSession(request: Request): Promise<AuthSession | null> {
  return getSessionFromRequest(request, resolveSessionSecret())
}
