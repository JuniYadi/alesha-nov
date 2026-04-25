import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthGuard } from '@alesha-nov/auth-react'
import { authUserQueryOptions, useAuthUser, useLogoutMutation } from '../query/auth'
import { queryClient } from '../query/client'
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

    if (typeof window !== 'undefined') {
      void queryClient.prefetchQuery(authUserQueryOptions({ basePath: '/auth' }))
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const authUserQuery = useAuthUser({ basePath: '/auth' })
  const logoutMutation = useLogoutMutation({ basePath: '/auth' })

  const user = authUserQuery.data?.user
  const session = authUserQuery.data?.session
  const error = logoutMutation.error instanceof Error ? logoutMutation.error.message : null

  return (
    <main className="page-wrap px-4 py-12">
      <AuthGuard redirectTo="/login" fallback={<p>Checking session...</p>}>
        <section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
          <h1 className="display-title mb-3 text-3xl font-bold">Dashboard (Protected)</h1>
          <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">User: {user?.email}</p>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">Roles: {session?.roles.join(', ') || '-'}</p>
          <button className="rounded-md border px-4 py-2" disabled={logoutMutation.isPending} onClick={() => void logoutMutation.mutateAsync()} type="button">
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </button>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>
      </AuthGuard>
    </main>
  )
}
