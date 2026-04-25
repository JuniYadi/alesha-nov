import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authUserQueryOptions, useAuthUser, useLogoutMutation, useRevokeSessionMutation } from '../../query/auth'
import { queryClient } from '../../query/client'
import { getServerSessionOrNull } from '../../server/session'

export const Route = createFileRoute('/settings/sessions')({
  beforeLoad: async ({ location }) => {
    const session = await getServerSessionOrNull()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    if (typeof window !== 'undefined') {
      void queryClient.prefetchQuery(authUserQueryOptions({ basePath: '/auth' }))
    }
  },
  component: SessionSettingsPage,
})

function SessionSettingsPage() {
  const authUserQuery = useAuthUser({ basePath: '/auth' })
  const logoutMutation = useLogoutMutation({ basePath: '/auth' })
  const revokeSessionMutation = useRevokeSessionMutation({ basePath: '/auth' })

  const session = authUserQuery.data?.session

  const [revokeAllLoading, setRevokeAllLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revokeCurrentSession = async () => {
    setError(null)

    try {
      await revokeSessionMutation.mutateAsync()
      await logoutMutation.mutateAsync()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke current session')
    }
  }

  const revokeAllSessions = async () => {
    setRevokeAllLoading(true)
    setError(null)

    try {
      const response = await fetch('/auth/sessions/revoke-all', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokens: [] }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Failed to revoke all sessions')
      }

      await logoutMutation.mutateAsync()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke all sessions')
    } finally {
      setRevokeAllLoading(false)
    }
  }

  const logoutError = logoutMutation.error instanceof Error ? logoutMutation.error.message : null
  const revokeError = revokeSessionMutation.error instanceof Error ? revokeSessionMutation.error.message : null

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Session settings</h1>
        <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">User ID: {session?.userId ?? '-'}</p>
        <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">Email: {session?.email ?? '-'}</p>
        <p className="mb-5 text-sm text-[var(--sea-ink-soft)]">Roles: {session?.roles.join(', ') || '-'}</p>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-md border px-4 py-2" disabled={revokeSessionMutation.isPending || logoutMutation.isPending} onClick={() => void revokeCurrentSession()} type="button">
            {revokeSessionMutation.isPending ? 'Revoking...' : 'Revoke Current Session'}
          </button>
          <button className="rounded-md border px-4 py-2" disabled={revokeAllLoading || logoutMutation.isPending} onClick={() => void revokeAllSessions()} type="button">
            {revokeAllLoading ? 'Revoking...' : 'Revoke All Sessions'}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {revokeError ? <p className="mt-3 text-sm text-red-600">{revokeError}</p> : null}
        {logoutError ? <p className="mt-3 text-sm text-red-600">{logoutError}</p> : null}
      </section>
    </main>
  )
}
