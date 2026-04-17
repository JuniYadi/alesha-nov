import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@alesha-nov/auth-react'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { status, user } = useAuth()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Issue #56 Demo App</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          TanStack Start + Alesha Auth packages
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          This app demonstrates signup, login, magic-link verify, a protected dashboard,
          and logout using @alesha-nov/auth-web and @alesha-nov/auth-react.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/signup" className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline">
            Go to Signup
          </Link>
          <Link to="/login" className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline">
            Go to Login
          </Link>
          <Link to="/api" className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline">
            API Playground
          </Link>
          <Link to="/dashboard" className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline">
            Open Dashboard
          </Link>
        </div>
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Auth status: <b>{status}</b>
          {user ? ` — ${user.email}` : ''}
        </p>
      </section>
    </main>
  )
}
