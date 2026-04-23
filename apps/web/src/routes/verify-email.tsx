import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
})

type VerifyState = 'idle' | 'verifying' | 'verified' | 'error'

function VerifyEmailPage() {
  const { token } = Route.useSearch()
  const tokenValue = useMemo(() => token.trim(), [token])

  const [verifyState, setVerifyState] = useState<VerifyState>(tokenValue ? 'verifying' : 'idle')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (!tokenValue) return

    let cancelled = false

    const run = async () => {
      setVerifyState('verifying')
      setVerifyError(null)

      try {
        const response = await fetch('/auth/email-verification/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: tokenValue }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? 'Email verification failed')
        }

        if (!cancelled) {
          setVerifyState('verified')
        }
      } catch (e) {
        if (!cancelled) {
          setVerifyState('error')
          setVerifyError(e instanceof Error ? e.message : 'Email verification failed')
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [tokenValue])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Verify email</h1>

        {verifyState === 'verifying' ? <p className="text-sm text-[var(--sea-ink-soft)]">Verifying your email...</p> : null}
        {verifyState === 'verified' ? (
          <p className="text-sm text-emerald-700">
            Email verified successfully. Continue to{' '}
            <Link to="/login" className="underline">
              login
            </Link>
            .
          </p>
        ) : null}
        {verifyState === 'error' ? <p className="text-sm text-red-600">{verifyError ?? 'Email verification failed'}</p> : null}
        {verifyState === 'idle' ? <p className="text-sm text-red-600">Invalid verification link</p> : null}

        <form
          className="mt-6 space-y-3 border-t pt-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setResendLoading(true)
            setResendError(null)
            setResendSuccess(false)

            try {
              const response = await fetch('/auth/email-verification/request', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: resendEmail }),
              })

              if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string }
                throw new Error(payload.error ?? 'Failed to resend verification email')
              }

              setResendSuccess(true)
            } catch (e) {
              setResendError(e instanceof Error ? e.message : 'Failed to resend verification email')
            } finally {
              setResendLoading(false)
            }
          }}
        >
          <h2 className="text-base font-semibold">Resend verification email</h2>
          <input
            className="w-full rounded-md border p-2"
            placeholder="Email"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            required
          />
          <button className="rounded-md border px-4 py-2" disabled={resendLoading} type="submit">
            {resendLoading ? 'Sending...' : 'Resend'}
          </button>
          {resendError ? <p className="text-sm text-red-600">{resendError}</p> : null}
          {resendSuccess ? <p className="text-sm text-emerald-700">Verification email request sent.</p> : null}
        </form>
      </section>
    </main>
  )
}
