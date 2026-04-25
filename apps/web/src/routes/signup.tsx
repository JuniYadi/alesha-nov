import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useSignupMutation } from '../query/auth'
import { getServerSessionOrNull } from '../server/session'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const session = await getServerSessionOrNull()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
})

function SignupPage() {
  const signupMutation = useSignupMutation({ basePath: '/auth' })
  const signupError = signupMutation.error instanceof Error ? signupMutation.error.message : null
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
            await signupMutation.mutateAsync({ email, password, name })
          }}
        >
          <input className="w-full rounded-md border p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-md border p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-md border p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="rounded-md border px-4 py-2" disabled={signupMutation.isPending} type="submit">
            {signupMutation.isPending ? 'Creating...' : 'Create account'}
          </button>
        </form>
        {signupError ? <p className="mt-3 text-sm text-red-600">{signupError}</p> : null}
        {signupMutation.data ? <p className="mt-3 text-sm text-emerald-700">Signed up: {signupMutation.data.email}</p> : null}
      </section>
    </main>
  )
}
