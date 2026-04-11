import { afterEach, describe, expect, test, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe('server/auth env resolution', () => {
  test('resolveSessionSecret uses env when set', async () => {
    process.env.SESSION_SECRET = '0123456789abcdef0123456789abcdef'

    const { resolveSessionSecret } = await import('./auth-config')
    expect(resolveSessionSecret()).toBe('0123456789abcdef0123456789abcdef')
  })

  test('resolveSessionSecret falls back to dev secret outside production', async () => {
    delete process.env.SESSION_SECRET
    process.env.NODE_ENV = 'development'

    const { resolveSessionSecret } = await import('./auth-config')
    expect(resolveSessionSecret()).toBe('dev-session-secret-change-me')
  })

  test('resolveSessionSecret throws when missing in production', async () => {
    delete process.env.SESSION_SECRET
    process.env.NODE_ENV = 'production'

    const { resolveSessionSecret } = await import('./auth-config')
    expect(() => resolveSessionSecret()).toThrowError('SESSION_SECRET is required in production')
  })

  test('resolveSecureCookie defaults true in production', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.AUTH_SECURE_COOKIE

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(true)
  })

  test('resolveSecureCookie defaults false in development', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.AUTH_SECURE_COOKIE

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(false)
  })

  test('resolveSecureCookie allows explicit override', async () => {
    process.env.NODE_ENV = 'production'
    process.env.AUTH_SECURE_COOKIE = 'false'

    const { resolveSecureCookie } = await import('./auth-config')
    expect(resolveSecureCookie()).toBe(false)

    process.env.AUTH_SECURE_COOKIE = '1'
    expect(resolveSecureCookie()).toBe(true)
  })
})
