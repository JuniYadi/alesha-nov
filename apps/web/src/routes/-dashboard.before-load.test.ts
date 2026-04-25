import { beforeEach, describe, expect, test, vi } from 'vitest'

const getServerSessionOrNullMock = vi.fn<() => Promise<{ userId: string } | null>>()
const prefetchQueryMock = vi.fn()
const authUserQueryOptionsMock = vi.fn(() => ({ queryKey: ['auth-user', '/auth', ''] as const, queryFn: vi.fn() }))

vi.mock('../server/session', () => ({
  getServerSessionOrNull: () => getServerSessionOrNullMock(),
}))

vi.mock('../query/client', () => ({
  queryClient: {
    prefetchQuery: (...args: unknown[]) => prefetchQueryMock(...args),
  },
}))

vi.mock('../query/auth', () => ({
  authUserQueryOptions: (...args: unknown[]) => authUserQueryOptionsMock(...args),
  useAuthUser: () => ({ data: null }),
  useLogoutMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}))

describe('dashboard route beforeLoad', () => {
  beforeEach(() => {
    getServerSessionOrNullMock.mockReset()
    prefetchQueryMock.mockReset()
    authUserQueryOptionsMock.mockClear()
  })

  test('redirects unauthenticated requests to /login with redirect target', async () => {
    getServerSessionOrNullMock.mockResolvedValue(null)

    const { Route } = await import('./dashboard')

    try {
      await Route.options.beforeLoad?.({
        location: { href: 'http://localhost:3000/dashboard' },
      } as never)
      throw new Error('Expected beforeLoad to throw redirect response')
    } catch (error) {
      expect(error).toBeInstanceOf(Response)
      const response = error as Response & { options?: { to?: string; search?: { redirect?: string } } }
      expect(response.status).toBe(307)
      expect(response.options?.to).toBe('/login')
      expect(response.options?.search?.redirect).toBe('http://localhost:3000/dashboard')
    }
  })

  test('allows authenticated requests without redirect', async () => {
    getServerSessionOrNullMock.mockResolvedValue({ userId: 'user-1' })

    const { Route } = await import('./dashboard')

    await expect(
      Route.options.beforeLoad?.({
        location: { href: 'http://localhost:3000/dashboard' },
      } as never),
    ).resolves.toBeUndefined()
  })

  test('prefetches auth user query on client-side beforeLoad', async () => {
    getServerSessionOrNullMock.mockResolvedValue({ userId: 'user-1' })

    vi.stubGlobal('window', { document: {} })

    const { Route } = await import('./dashboard')

    await Route.options.beforeLoad?.({
      location: { href: 'http://localhost:3000/dashboard' },
    } as never)

    expect(authUserQueryOptionsMock).toHaveBeenCalledWith({ basePath: '/auth' })
    expect(prefetchQueryMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})
