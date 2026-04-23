import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth, useOAuthLink } from '@alesha-nov/auth-react'
import { getServerSessionOrNull } from '../../server/session'

type LinkedAccount = {
  id: string
  provider: 'google' | 'github'
  providerAccountId: string
  providerEmail: string | null
}

export const Route = createFileRoute('/settings/oauth-link')({
  beforeLoad: async ({ location }) => {
    const session = await getServerSessionOrNull()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: OAuthLinkSettingsPage,
})

function OAuthLinkSettingsPage() {
  const { session } = useAuth()
  const { link, loading, error, data } = useOAuthLink({ basePath: '/auth' })

  const [accounts, setAccounts] = useState<LinkedAccount[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [googleAccountId, setGoogleAccountId] = useState('')
  const [githubAccountId, setGithubAccountId] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadAccounts = async () => {
      setListLoading(true)
      setListError(null)

      try {
        const response = await fetch('/auth/linked-accounts', {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? 'Failed to load linked accounts')
        }

        const payload = (await response.json()) as { accounts?: LinkedAccount[] }
        if (!cancelled) {
          setAccounts(payload.accounts ?? [])
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : 'Failed to load linked accounts')
        }
      } finally {
        if (!cancelled) {
          setListLoading(false)
        }
      }
    }

    void loadAccounts()

    return () => {
      cancelled = true
    }
  }, [data])

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell mx-auto max-w-2xl rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold">Linked accounts</h1>
        <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">Signed in as {session?.email}</p>

        {listLoading ? <p className="text-sm text-[var(--sea-ink-soft)]">Loading linked accounts...</p> : null}
        {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

        {!listLoading && !listError ? (
          <ul className="mb-6 space-y-2 text-sm">
            {accounts.length === 0 ? (
              <li className="text-[var(--sea-ink-soft)]">No linked OAuth accounts yet.</li>
            ) : (
              accounts.map((account) => (
                <li key={account.id} className="rounded-md border p-2">
                  <span className="font-semibold">{account.provider}</span> — {account.providerAccountId}
                  {account.providerEmail ? ` (${account.providerEmail})` : ''}
                </li>
              ))
            )}
          </ul>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <input
              className="w-full rounded-md border p-2"
              placeholder="Google account ID"
              value={googleAccountId}
              onChange={(e) => setGoogleAccountId(e.target.value)}
            />
            <button
              className="rounded-md border px-4 py-2"
              disabled={loading || !googleAccountId.trim()}
              onClick={() =>
                void link('google', {
                  providerAccountId: googleAccountId.trim(),
                })
              }
              type="button"
            >
              Link Google
            </button>
          </div>

          <div className="space-y-2">
            <input
              className="w-full rounded-md border p-2"
              placeholder="GitHub account ID"
              value={githubAccountId}
              onChange={(e) => setGithubAccountId(e.target.value)}
            />
            <button
              className="rounded-md border px-4 py-2"
              disabled={loading || !githubAccountId.trim()}
              onClick={() =>
                void link('github', {
                  providerAccountId: githubAccountId.trim(),
                })
              }
              type="button"
            >
              Link GitHub
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {data ? <p className="mt-3 text-sm text-emerald-700">Linked {data.provider} account successfully.</p> : null}
      </section>
    </main>
  )
}
