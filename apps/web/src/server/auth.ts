import '@tanstack/react-start/server-only'

import { createDatabaseClient, resolveDBType, runMigrations, authMigrationsBundle } from '@alesha-nov/db'
import { createAuthService, getUserById } from '@alesha-nov/auth'
import { getSessionFromRequest, type AuthSession } from '@alesha-nov/auth-web'
import { createTanstackAuthHandler } from '@alesha-nov/auth-web/tanstack'
import { resolveSessionSecret, resolveSecureCookie } from './auth-config'
import { createAuthEmailOptions } from './email'

async function buildHandler() {
  const dbConfig = {
    type: resolveDBType(),
    url: process.env.DATABASE_URL ?? ':memory:',
  }

  const dbClient = createDatabaseClient(dbConfig)
  await runMigrations(dbClient, authMigrationsBundle)

  const emailOptions = createAuthEmailOptions()
  const authService = await createAuthService(dbConfig, { email: emailOptions }, dbClient)

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
