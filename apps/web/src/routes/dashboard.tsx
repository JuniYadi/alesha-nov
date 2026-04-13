import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthGuard, useAuth, useLogout } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../server/session'
import { type AuthSession } from '@alesha-nov/auth-web'

type SessionProvider = () => Promise<AuthSession | null>

export async function dashboardBeforeLoad({
  location,
  sessionProvider = getServerSessionOrNull,
}: {
  location: { href: string }
  sessionProvider?: SessionProvider
}): Promise<void> {
  const session = await sessionProvider()

  if (!session) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    })
  }
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ location }) => dashboardBeforeLoad({ location }),
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
