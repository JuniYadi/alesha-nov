import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { usePasswordResetRequest } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../server/session'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: async () => {
    const session = await getServerSessionOrNull()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { request, loading, error, sent } = usePasswordResetRequest({ basePath: '/auth' })
  const [email, setEmail] = useState('')

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Forgot password</h1>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            await request(email)
          }}
        >
          <input
            className="w-full rounded-md border p-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="rounded-md border px-4 py-2" disabled={loading} type="submit">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {sent ? <p className="mt-3 text-sm text-emerald-700">Check your email.</p> : null}
        <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
          Back to{' '}
          <Link to="/login" className="underline">
            login
          </Link>
        </p>
      </section>
    </main>
  )
}
