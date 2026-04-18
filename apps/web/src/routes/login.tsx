import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useLogin, useMagicLinkRequest, useMagicLinkVerify, useAuth } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../server/session'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getServerSessionOrNull()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { login, loading, error } = useLogin({ basePath: '/auth' })
  const magicReq = useMagicLinkRequest({ basePath: '/auth' })
  const magicVerify = useMagicLinkVerify({ basePath: '/auth' })
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicEmail, setMagicEmail] = useState('')
  const [token, setToken] = useState('')

  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Login with email/password</h2>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              await login({ email, password })
            }}
          >
            <input className="w-full rounded-md border p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full rounded-md border p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="rounded-md border px-4 py-2" disabled={loading} type="submit">{loading ? 'Loading...' : 'Login'}</button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Magic link demo</h2>
          <div className="space-y-3">
            <input className="w-full rounded-md border p-2" placeholder="Email" type="email" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} required />
            <button
              className="rounded-md border px-4 py-2"
              disabled={magicReq.loading}
              onClick={async () => {
                await magicReq.request({ email: magicEmail })
              }}
              type="button"
            >
              {magicReq.loading ? 'Requesting...' : 'Request magic link token'}
            </button>
            {magicReq.error ? <p className="text-sm text-red-600">{magicReq.error}</p> : null}
            {magicReq.sent ? <p className="text-sm text-emerald-700">Token issued on backend (demo mode).</p> : null}

            <input className="w-full rounded-md border p-2" placeholder="Paste token from backend response" value={token} onChange={(e) => setToken(e.target.value)} />
            <button
              className="rounded-md border px-4 py-2"
              disabled={magicVerify.loading}
              onClick={async () => {
                await magicVerify.verify({ token })
              }}
              type="button"
            >
              Verify magic link token
            </button>
            {magicVerify.error ? <p className="text-sm text-red-600">{magicVerify.error}</p> : null}
          </div>
        </div>
      </section>

      {user ? <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">Current user: {user.email}</p> : null}
    </main>
  )
}
