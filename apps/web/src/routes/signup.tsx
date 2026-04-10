import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useSignup } from '@alesha-nov/auth-react'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  const { signup, loading, error, data } = useSignup({ basePath: '/auth' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Signup</h1>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            await signup({ email, password, name })
          }}
        >
          <input className="w-full rounded-md border p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-md border p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-md border p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="rounded-md border px-4 py-2" disabled={loading} type="submit">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {data ? <p className="mt-3 text-sm text-emerald-700">Signed up: {data.email}</p> : null}
      </section>
    </main>
  )
}
