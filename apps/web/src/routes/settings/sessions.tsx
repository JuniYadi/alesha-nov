import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth, useLogout } from '@alesha-nov/auth-react'
import { useState } from 'react'
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
  },
  component: SessionSettingsPage,
})

function SessionSettingsPage() {
  const { session } = useAuth()
  const { logout, loading: logoutLoading, error: logoutError } = useLogout({ basePath: '/auth' })

  const [revokeLoading, setRevokeLoading] = useState(false)
  const [revokeAllLoading, setRevokeAllLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revokeCurrentSession = async () => {
    setRevokeLoading(true)
    setError(null)

    try {
      const response = await fetch('/auth/sessions/revoke', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Failed to revoke current session')
      }

      await logout()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke current session')
    } finally {
      setRevokeLoading(false)
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

      await logout()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke all sessions')
    } finally {
      setRevokeAllLoading(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Session settings</h1>
        <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">User ID: {session?.userId ?? '-'}</p>
        <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">Email: {session?.email ?? '-'}</p>
        <p className="mb-5 text-sm text-[var(--sea-ink-soft)]">Roles: {session?.roles.join(', ') || '-'}</p>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-md border px-4 py-2" disabled={revokeLoading || logoutLoading} onClick={() => void revokeCurrentSession()} type="button">
            {revokeLoading ? 'Revoking...' : 'Revoke Current Session'}
          </button>
          <button className="rounded-md border px-4 py-2" disabled={revokeAllLoading || logoutLoading} onClick={() => void revokeAllSessions()} type="button">
            {revokeAllLoading ? 'Revoking...' : 'Revoke All Sessions'}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {logoutError ? <p className="mt-3 text-sm text-red-600">{logoutError}</p> : null}
      </section>
    </main>
  )
}
