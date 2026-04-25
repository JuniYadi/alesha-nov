import { afterEach, describe, expect, test, vi } from 'vitest'
import { authUserQueryOptions, fetchAuthUser } from './auth'

describe('auth query helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('fetchAuthUser returns session and user when both endpoints succeed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session: { userId: 'u1', email: 'a@example.com', roles: ['admin'], exp: 123 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'u1', email: 'a@example.com', name: 'Alice', image: null, emailVerifiedAt: null, createdAt: 'now', roles: ['admin'] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAuthUser({ basePath: '/auth' })

    expect(result?.session.userId).toBe('u1')
    expect(result?.user?.email).toBe('a@example.com')
  })

  test('fetchAuthUser returns null when session endpoint is unauthorized', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'u1' } }), { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAuthUser({ basePath: '/auth' })).resolves.toBeNull()
  })

  test('authUserQueryOptions includes stable key with base config', () => {
    const options = authUserQueryOptions({ basePath: '/auth', baseUrl: 'http://localhost:3000' })

    expect(options.queryKey).toEqual(['session-user', '/auth', 'http://localhost:3000'])
  })
})
