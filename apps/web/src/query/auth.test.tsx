// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  AUTH_USER_QUERY_KEY,
  authUserQueryOptions,
  fetchAuthUser,
  useLoginMutation,
  useLogoutMutation,
  useRevokeSessionMutation,
  useSignupMutation,
} from './auth'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('auth query helpers', () => {
  test('fetchAuthUser returns auth payload when session exists', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ session: { userId: 'u-1', email: 'demo@example.com', roles: ['viewer'], exp: 9999999999 } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user: { id: 'u-1', email: 'demo@example.com', name: null, image: null, emailVerifiedAt: null, createdAt: '2026-01-01', roles: ['viewer'] } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )

    globalThis.fetch = fetchMock

    const payload = await fetchAuthUser({ basePath: '/auth' })

    expect(payload?.session.userId).toBe('u-1')
    expect(payload?.user?.email).toBe('demo@example.com')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/auth/session', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/auth/me', { credentials: 'include' })
  })

  test('fetchAuthUser returns null when session endpoint is unauthorized', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'u-1' } }), { status: 200 }))

    globalThis.fetch = fetchMock

    const payload = await fetchAuthUser({ basePath: '/auth' })

    expect(payload).toBeNull()
  })

  test('authUserQueryOptions includes scoped key parts', () => {
    const options = authUserQueryOptions({ basePath: '/auth', baseUrl: 'https://example.com' })

    expect(options.queryKey).toEqual([...AUTH_USER_QUERY_KEY, '/auth', 'https://example.com'])
  })
})

describe('auth mutations', () => {
  test('useLoginMutation posts to /login and invalidates auth cache', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u-1', email: 'demo@example.com' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useLoginMutation({ basePath: '/auth' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ email: 'demo@example.com', password: 'secret' })

    expect(globalThis.fetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'demo@example.com', password: 'secret' }),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY })
  })

  test('useSignupMutation posts to /signup and invalidates auth cache', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u-2', email: 'new@example.com' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSignupMutation({ basePath: '/auth' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ email: 'new@example.com', password: 'secret', name: 'New User' })

    expect(globalThis.fetch).toHaveBeenCalledWith('/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'new@example.com', password: 'secret', name: 'New User' }),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY })
  })

  test('useLogoutMutation posts to /logout and invalidates auth cache', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useLogoutMutation({ basePath: '/auth' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(globalThis.fetch).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY })
  })

  test('useRevokeSessionMutation posts to /sessions/revoke and invalidates auth cache', async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRevokeSessionMutation({ basePath: '/auth' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(globalThis.fetch).toHaveBeenCalledWith('/auth/sessions/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY })
  })
})
