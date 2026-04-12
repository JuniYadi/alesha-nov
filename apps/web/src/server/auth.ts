import { createAuthService } from '@alesha-nov/auth'
import { getSessionFromRequest, type AuthSession } from '@alesha-nov/auth-web'
import { createTanstackAuthHandler } from '@alesha-nov/auth-web/tanstack'
import {
  authMigrationsBundle,
  createDatabaseClient,
  resolveDBType,
  runMigrations,
} from '@alesha-nov/config'
import { createAuthEmailOptions } from './email'
import { resolveSessionConfig, resolveJWTSecret } from './auth-config'

async function buildHandler() {
  const dbType = resolveDBType()
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const dbConfig = {
    type: dbType,
    url: databaseUrl,
  }

  const dbClient = createDatabaseClient(dbConfig)
  await runMigrations(dbClient, authMigrationsBundle)

  const authService = await createAuthService(
    dbConfig,
    {
      email: createAuthEmailOptions(),
    },
  )

  const sessionConfig = resolveSessionConfig()

  return createTanstackAuthHandler({
    authService,
    basePath: '/auth',
    cookieName: sessionConfig.cookieName,
    sessionTtlSeconds: sessionConfig.ttlSeconds,
    secureCookie: sessionConfig.secure,
    sessionSecret: resolveJWTSecret(),
  })
}

let authHandlerPromise: Promise<ReturnType<typeof createTanstackAuthHandler>> | null = null

export async function getAuthHandler() {
  authHandlerPromise ??= buildHandler()
  return authHandlerPromise
}

export async function getServerSession(request: Request): Promise<AuthSession | null> {
  return getSessionFromRequest(request, resolveJWTSecret())
}
