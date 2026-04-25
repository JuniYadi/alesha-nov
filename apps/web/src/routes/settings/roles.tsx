import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@alesha-nov/auth-react'
import { useMemo, useState } from 'react'
import { authUserQueryOptions } from '../../query/auth'
import { queryClient } from '../../query/client'
import { getServerSessionOrNull } from '../../server/session'

const ADMIN_PERMISSIONS = new Set(['admin', 'roles:write:any'])

export const Route = createFileRoute('/settings/roles')({
  beforeLoad: async ({ location }) => {
    const session = await getServerSessionOrNull()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    const canManageRoles = session.roles.some((role) => ADMIN_PERMISSIONS.has(role))
    if (!canManageRoles) {
      throw redirect({ to: '/dashboard' })
    }

    if (typeof window !== 'undefined') {
      void queryClient.prefetchQuery(authUserQueryOptions({ basePath: '/auth' }))
    }
  },
  component: RolesSettingsPage,
})

function RolesSettingsPage() {
  const { session } = useAuth()

  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canManageRoles = useMemo(
    () => (session?.roles ?? []).some((entry) => ADMIN_PERMISSIONS.has(entry)),
    [session?.roles],
  )

  const onUpdateRole = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/auth/roles', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId.trim(),
          roles: [role],
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Failed to update role')
      }

      setSuccess(`Role updated to ${role}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Role management</h1>

        {!canManageRoles ? <p className="text-sm text-red-600">Admin access required.</p> : null}

        <div className="space-y-3">
          <input
            className="w-full rounded-md border p-2"
            placeholder="Target user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />

          <select className="w-full rounded-md border p-2" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>

          <button
            className="rounded-md border px-4 py-2"
            disabled={!canManageRoles || loading || !userId.trim()}
            onClick={() => void onUpdateRole()}
            type="button"
          >
            {loading ? 'Updating...' : 'Update Role'}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
      </section>
    </main>
  )
}
