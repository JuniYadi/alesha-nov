import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { randomUUID } from 'node:crypto'

const ORIGINAL_ENV = { ...process.env }

type HttpRequestInit = Omit<RequestInit, 'body'> & {
  body?: string
}

function extractCookie(setCookieHeader: string | null): string {
  return setCookieHeader?.split(';')[0] ?? ''
}

function authJsonRequest(path: string, init: HttpRequestInit): Request {
  return new Request(`https://example.local${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...('headers' in init ? init.headers : {}),
    },
  })
}

describe('auth endpoint integration', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.resetModules()

    process.env.DB_TYPE = 'sqlite'
    process.env.DATABASE_URL = ':memory:'
    delete process.env.SESSION_SECRET
    delete process.env.AUTH_SECURE_COOKIE
  })

  afterEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  test('returns 200 and user payload for GET /auth/me after login', async () => {
    const unique = randomUUID()
    const email = `issue96-${unique}@example.com`
    const password = 'Passw0rd!'

    const { getAuthHandler } = await import('./auth')
    const handler = await getAuthHandler()

    const signupResponse = await handler(
      authJsonRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: 'Issue Reporter', email, password }),
      }),
    )
    expect(signupResponse.status).toBe(200)

    const loginResponse = await handler(
      authJsonRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    )
    expect(loginResponse.status).toBe(200)

    const authCookie = extractCookie(loginResponse.headers.get('set-cookie'))
    expect(authCookie).toContain('alesha_auth=')

    const meResponse = await handler(
      authJsonRequest('/auth/me', {
        method: 'GET',
        headers: { cookie: authCookie },
      }),
    )

    expect(meResponse.status).toBe(200)
    const meBody = (await meResponse.json()) as { user: { email: string } }
    expect(meBody.user.email).toBe(email)
  })
})
