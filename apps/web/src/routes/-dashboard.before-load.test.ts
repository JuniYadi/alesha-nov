import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AuthSession } from '@alesha-nov/auth-web'
import { dashboardBeforeLoad } from './dashboard'

const sessionProviderMock = vi.fn<() => Promise<AuthSession | null>>()

describe('dashboard route beforeLoad', () => {
  beforeEach(() => {
    sessionProviderMock.mockReset()
  })

  test('redirects unauthenticated requests to /login with redirect target', async () => {
    sessionProviderMock.mockResolvedValue(null)

    try {
      await dashboardBeforeLoad({
        sessionProvider: sessionProviderMock,
        location: { href: 'http://localhost:3000/dashboard' },
      })
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
    sessionProviderMock.mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
      email: 'user@example.com',
      roles: ['user'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    await expect(
      dashboardBeforeLoad({
        sessionProvider: sessionProviderMock,
        location: { href: 'http://localhost:3000/dashboard' },
      }),
    ).resolves.toBeUndefined()
  })
})
