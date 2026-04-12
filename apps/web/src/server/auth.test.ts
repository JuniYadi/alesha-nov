import { afterEach, describe, expect, test, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe('server/auth env resolution', () => {
  test('resolveJWTSecret uses env when set', async () => {
    process.env.AUTH_JWT_SECRET = '0123456789abcdef0123456789abcdef'

    const { resolveJWTSecret } = await import('./auth-config')
    expect(resolveJWTSecret()).toBe('0123456789abcdef0123456789abcdef')
  })

  test('resolveJWTSecret falls back to JWT_SECRET alias', async () => {
    delete process.env.AUTH_JWT_SECRET
    process.env.JWT_SECRET = 'abcdef0123456789abcdef0123456789'

    const { resolveJWTSecret } = await import('./auth-config')
    expect(resolveJWTSecret()).toBe('abcdef0123456789abcdef0123456789')
  })

  test('resolveJWTSecret throws when missing', async () => {
    delete process.env.AUTH_JWT_SECRET
    delete process.env.JWT_SECRET

    const { resolveJWTSecret } = await import('./auth-config')
    expect(() => resolveJWTSecret()).toThrowError('Missing JWT secret. Set AUTH_JWT_SECRET or JWT_SECRET.')
  })

  test('resolveSessionConfig resolves explicit values', async () => {
    process.env.AUTH_SESSION_COOKIE_NAME = 'app_session'
    process.env.AUTH_SESSION_TTL_SECONDS = '7200'
    process.env.AUTH_SESSION_SECURE = 'true'
    process.env.AUTH_SESSION_SAME_SITE = 'strict'

    const { resolveSessionConfig } = await import('./auth-config')
    expect(resolveSessionConfig()).toEqual({
      cookieName: 'app_session',
      ttlSeconds: 7200,
      secure: true,
      sameSite: 'strict',
    })
  })

  test('resolveSessionConfig applies defaults when env is missing', async () => {
    delete process.env.AUTH_SESSION_COOKIE_NAME
    delete process.env.AUTH_SESSION_TTL_SECONDS
    delete process.env.AUTH_SESSION_SECURE
    delete process.env.AUTH_SESSION_SAME_SITE

    const { resolveSessionConfig } = await import('./auth-config')
    expect(resolveSessionConfig()).toEqual({
      cookieName: 'alesha_session',
      ttlSeconds: 604800,
      secure: false,
      sameSite: 'lax',
    })
  })

  test('resolveSessionConfig supports alternative env names', async () => {
    delete process.env.AUTH_SESSION_COOKIE_NAME
    delete process.env.AUTH_SESSION_TTL_SECONDS
    delete process.env.AUTH_SESSION_SECURE
    delete process.env.AUTH_SESSION_SAME_SITE
    process.env.SESSION_COOKIE_NAME = 'legacy_session'
    process.env.SESSION_TTL_SECONDS = '900'
    process.env.SESSION_SECURE = 'true'
    process.env.SESSION_SAME_SITE = 'none'

    const { resolveSessionConfig } = await import('./auth-config')
    expect(resolveSessionConfig()).toEqual({
      cookieName: 'legacy_session',
      ttlSeconds: 900,
      secure: true,
      sameSite: 'none',
    })

    delete process.env.SESSION_COOKIE_NAME
    delete process.env.SESSION_TTL_SECONDS
    delete process.env.SESSION_SECURE
    delete process.env.SESSION_SAME_SITE
  })
})
