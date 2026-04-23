import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useResetPassword } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../server/session'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  beforeLoad: async () => {
    const session = await getServerSessionOrNull()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const { reset, loading, error, success } = useResetPassword({ basePath: '/auth' })

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const tokenValue = useMemo(() => token.trim(), [token])
  const invalidToken = tokenValue.length === 0

  useEffect(() => {
    if (!success) return
    const id = window.setTimeout(() => {
      void navigate({ to: '/login' })
    }, 2000)

    return () => window.clearTimeout(id)
  }, [navigate, success])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Reset password</h1>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setLocalError(null)

            if (invalidToken) {
              setLocalError('Invalid reset link')
              return
            }

            if (password !== confirmPassword) {
              setLocalError('Password confirmation does not match')
              return
            }

            await reset(tokenValue, password)
          }}
        >
          <input
            className="w-full rounded-md border p-2"
            placeholder="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border p-2"
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button className="rounded-md border px-4 py-2" disabled={loading || invalidToken} type="submit">
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        {invalidToken ? <p className="mt-3 text-sm text-red-600">Invalid reset link</p> : null}
        {localError ? <p className="mt-3 text-sm text-red-600">{localError}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-700">Password reset successful. Redirecting to login...</p> : null}
      </section>
    </main>
  )
}
