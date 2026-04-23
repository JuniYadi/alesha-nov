import { afterEach, describe, expect, test, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe('server/auth-config', () => {
  test('resolveSessionSecret reads AUTH_JWT_SECRET', async () => {
    process.env.AUTH_JWT_SECRET = 'my-jwt-secret-value'

    const { resolveSessionSecret } = await import('./auth-config')
    expect(resolveSessionSecret()).toBe('my-jwt-secret-value')
  })

  test('resolveSessionSecret reads JWT_SECRET fallback', async () => {
    delete process.env.AUTH_JWT_SECRET
    process.env.JWT_SECRET = 'fallback-jwt-secret'

    const { resolveSessionSecret } = await import('./auth-config')
    expect(resolveSessionSecret()).toBe('fallback-jwt-secret')
  })

  test('resolveSessionSecret throws when no secret configured', async () => {
    delete process.env.AUTH_JWT_SECRET
    delete process.env.JWT_SECRET

    const { resolveSessionSecret } = await import('./auth-config')
    expect(() => resolveSessionSecret()).toThrowError('Missing JWT secret')
  })

  test('resolveSecureCookie reads AUTH_SESSION_SECURE true', async () => {
    process.env.AUTH_SESSION_SECURE = 'true'

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(true)
  })

  test('resolveSecureCookie reads SESSION_SECURE true', async () => {
    delete process.env.AUTH_SESSION_SECURE
    process.env.SESSION_SECURE = 'true'

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(true)
  })

  test('resolveSecureCookie defaults to false', async () => {
    delete process.env.AUTH_SESSION_SECURE
    delete process.env.SESSION_SECURE

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(false)
  })
})
