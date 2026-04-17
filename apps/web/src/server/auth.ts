import '@tanstack/react-start/server-only'

import { createDatabaseClient } from '@alesha-nov/db'
import { createAuthService, getUserById } from '@alesha-nov/auth'
import { getSessionFromRequest, type AuthSession } from '@alesha-nov/auth-web'
import { createTanstackAuthHandler } from '@alesha-nov/auth-web/tanstack'
import { resolveSecureCookie, resolveSessionSecret } from './auth-config'

console.log('[DEBUG] auth.ts module loaded. DB_TYPE:', process.env.DB_TYPE, '| DATABASE_URL:', process.env.DATABASE_URL)

function resolveDbType(): 'mysql' | 'postgresql' | 'sqlite' {
  const raw = process.env.DB_TYPE?.toLowerCase()
  console.log('[DEBUG] resolveDbType() → raw:', raw)
  if (raw === 'mysql' || raw === 'postgresql' || raw === 'sqlite') return raw
  if (raw === 'postgres') return 'postgresql'
  return 'sqlite'
}

async function buildHandler() {
  const dbType = resolveDbType()
  const dbUrl = process.env.DATABASE_URL ?? ':memory:'
  console.log('[DEBUG] buildHandler() → type:', dbType, 'url:', dbUrl)
  const dbConfig = {
    type: dbType,
    url: dbUrl,
  }

  const dbClient = createDatabaseClient(dbConfig)
  const authService = await createAuthService(dbConfig, {}, dbClient)

  return createTanstackAuthHandler({
    authService,
    basePath: '/auth',
    secureCookie: resolveSecureCookie(),
    sessionSecret: resolveSessionSecret(),
    getUser: (userId) => getUserById(dbClient, userId),
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
