import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthGuard, useAuth, useLogout } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../server/session'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    const session = await getServerSessionOrNull()

    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user, session } = useAuth()
  const { logout, loading, error } = useLogout({ basePath: '/auth' })

  return (
    <main className="page-wrap px-4 py-12">
      <AuthGuard redirectTo="/login" fallback={<p>Checking session...</p>}>
        <section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
          <h1 className="display-title mb-3 text-3xl font-bold">Dashboard (Protected)</h1>
          <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">User: {user?.email}</p>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">Roles: {session?.roles.join(', ') || '-'}</p>
          <button className="rounded-md border px-4 py-2" disabled={loading} onClick={() => void logout()} type="button">
            {loading ? 'Logging out...' : 'Logout'}
          </button>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>
      </AuthGuard>
    </main>
  )
}
