import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@alesha-nov/auth-react'

export const Route = createFileRoute('/api')({ component: ApiPage })

const BASE = '/auth'

interface ApiResult {
  method: string
  path: string
  status: number
  body: unknown
  duration: number
  cookie?: string
}

function JsonDisplay({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function ApiCard({ method, path, description, auth, children }: {
  method: string
  path: string
  description: string
  auth: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${
          method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
          method === 'POST' ? 'bg-blue-100 text-blue-700' :
          method === 'PUT' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {method}
        </span>
        <code className="text-sm font-semibold text-[var(--sea-ink)]">{path}</code>
        {auth && <span className="ml-auto rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">requires auth</span>}
        {!auth && <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">public</span>}
      </div>
      <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">{description}</p>
      {children}
    </div>
  )
}

function ApiPage() {
  const { status, user } = useAuth()
  const [session, setSession] = useState<unknown>(null)
  const [sessionStatus, setSessionStatus] = useState<number | null>(null)
  const [results, setResults] = useState<ApiResult[]>([])
  const [loading, setLoading] = useState(false)

  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupResult, setSignupResult] = useState<ApiResult | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginResult, setLoginResult] = useState<ApiResult | null>(null)

  const [meResult, setMeResult] = useState<ApiResult | null>(null)
  const [logoutResult, setLogoutResult] = useState<ApiResult | null>(null)

  const [magicEmail, setMagicEmail] = useState('')
  const [magicToken, setMagicToken] = useState('')
  const [magicResult, setMagicResult] = useState<ApiResult | null>(null)
  const [magicVerifyResult, setMagicVerifyResult] = useState<ApiResult | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetch(`${BASE}/session`, { credentials: 'include' })
        .then(r => { setSessionStatus(r.status); return r.json() })
        .then(d => setSession(d))
        .catch(() => setSession(null))
    }
  }, [status])

  async function handleRequest(
    _label: string,
    method: string,
    path: string,
    body?: unknown,
    setResult?: (r: ApiResult) => void
  ) {
    if (!setResult) return
    setLoading(true)
    const start = Date.now()
    try {
      const opts: RequestInit = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
      if (body) opts.body = JSON.stringify(body)

      const res = await fetch(`${BASE}${path}`, opts)
      let resBody: unknown
      try { resBody = await res.json() } catch { resBody = await res.text() }
      const duration = Date.now() - start

      const result: ApiResult = {
        method,
        path,
        status: res.status,
        body: resBody,
        duration,
        cookie: res.headers.get('set-cookie') ?? undefined,
      }
      setResult(result)
      setResults(prev => [result, ...prev])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="island-shell rounded-2xl p-6">
          <h1 className="display-title mb-2 text-3xl font-bold">API Playground</h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Test @alesha-nov/auth-web API endpoints directly from the browser.
            Auth state is shared with the app — sign in via the login page first for protected endpoints.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Current Auth State</h2>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
              status === 'authenticated' ? 'bg-emerald-50 text-emerald-700' :
              status === 'loading' ? 'bg-amber-50 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {status}
            </span>
            {user && (
              <span className="text-sm text-[var(--sea-ink-soft)]">{user.email}</span>
            )}
          </div>

          {status === 'authenticated' && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">Session Data</h3>
              <pre className="rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(session, null, 2)}
              </pre>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded border px-3 py-1.5 text-sm hover:bg-[var(--chip-bg)]"
                  onClick={() => handleRequest('session', 'GET', '/session', undefined, (r) => { setSessionStatus(r.status); setSession(r.body as any) })}
                  disabled={loading}
                >
                  Refresh Session
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Public Endpoints</h2>

          <ApiCard
            method="POST"
            path="/auth/signup"
            description="Create a new account. Sets session cookie automatically."
            auth={false}
          >
            <div className="space-y-2">
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Name" value={signupName} onChange={e => setSignupName(e.target.value)} />
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('signup', 'POST', '/signup', { email: signupEmail, password: signupPassword, name: signupName }, setSignupResult)}
                disabled={loading || !signupEmail || !signupPassword}
              >
                {loading ? 'Sending...' : 'Send POST /auth/signup'}
              </button>
              {signupResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      signupResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{signupResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{signupResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={signupResult.body} />
                </div>
              )}
            </div>
          </ApiCard>

          <ApiCard
            method="POST"
            path="/auth/login"
            description="Authenticate with email and password. Sets session cookie on success."
            auth={false}
          >
            <div className="space-y-2">
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('login', 'POST', '/login', { email: loginEmail, password: loginPassword }, setLoginResult)}
                disabled={loading || !loginEmail || !loginPassword}
              >
                {loading ? 'Sending...' : 'Send POST /auth/login'}
              </button>
              {loginResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      loginResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{loginResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{loginResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={loginResult.body} />
                </div>
              )}
            </div>
          </ApiCard>

          <ApiCard
            method="POST"
            path="/auth/magic-link/request"
            description="Issue a magic link token. In demo mode the raw token is returned directly (no email sent)."
            auth={false}
          >
            <div className="space-y-2">
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Email" type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} />
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('magic-request', 'POST', '/magic-link/request', { email: magicEmail }, setMagicResult)}
                disabled={loading || !magicEmail}
              >
                {loading ? 'Sending...' : 'Send POST /auth/magic-link/request'}
              </button>
              {magicResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      magicResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{magicResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{magicResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={magicResult.body} />
                </div>
              )}
            </div>
          </ApiCard>

          <ApiCard
            method="POST"
            path="/auth/magic-link/verify"
            description="Verify a magic link token and issue a session."
            auth={false}
          >
            <div className="space-y-2">
              <input className="w-full rounded-md border p-2 text-sm" placeholder="Token from /magic-link/request" value={magicToken} onChange={e => setMagicToken(e.target.value)} />
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('magic-verify', 'POST', '/magic-link/verify', { token: magicToken }, setMagicVerifyResult)}
                disabled={loading || !magicToken}
              >
                {loading ? 'Verifying...' : 'Send POST /auth/magic-link/verify'}
              </button>
              {magicVerifyResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      magicVerifyResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{magicVerifyResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{magicVerifyResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={magicVerifyResult.body} />
                </div>
              )}
            </div>
          </ApiCard>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Protected Endpoints <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">(requires auth)</span></h2>

          <ApiCard
            method="GET"
            path="/auth/session"
            description="Returns the current session for the provided cookie. 401 if not authenticated."
            auth={true}
          >
            <div className="space-y-2">
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('session', 'GET', '/session', undefined, (r) => { setSessionStatus(r.status); setSession(r.body as any) })}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Send GET /auth/session'}
              </button>
              {sessionStatus && (
                <div className="mt-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 font-bold ${
                    sessionStatus === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{sessionStatus}</span>
                </div>
              )}
              {session != null && sessionStatus === 200 && (
                <JsonDisplay data={session} />
              )}
            </div>
          </ApiCard>

          <ApiCard
            method="GET"
            path="/auth/me"
            description="Returns the full user object for the current session."
            auth={true}
          >
            <div className="space-y-2">
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('me', 'GET', '/me', undefined, setMeResult)}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Send GET /auth/me'}
              </button>
              {meResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      meResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{meResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{meResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={meResult.body} />
                </div>
              )}
            </div>
          </ApiCard>

          <ApiCard
            method="POST"
            path="/auth/logout"
            description="Revoke the current session and clear the cookie."
            auth={true}
          >
            <div className="space-y-2">
              <button
                className="rounded-md border px-4 py-2 text-sm hover:bg-[var(--chip-bg)] disabled:opacity-50"
                onClick={() => handleRequest('logout', 'POST', '/logout', undefined, setLogoutResult)}
                disabled={loading}
              >
                {loading ? 'Logging out...' : 'Send POST /auth/logout'}
              </button>
              {logoutResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-bold ${
                      logoutResult.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{logoutResult.status}</span>
                    <span className="text-[var(--sea-ink-soft)]">{logoutResult.duration}ms</span>
                  </div>
                  <JsonDisplay data={logoutResult.body} />
                </div>
              )}
            </div>
          </ApiCard>
        </div>

        {results.length > 0 && (
          <div className="island-shell rounded-2xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Request History</h2>
              <button
                className="text-xs text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                onClick={() => setResults([])}
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-[var(--line)] p-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 font-bold ${
                    r.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                    r.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{r.method}</span>
                  <code className="text-[var(--sea-ink)]">{r.path}</code>
                  <span className={`ml-auto rounded px-1.5 py-0.5 font-bold ${
                    r.status >= 200 && r.status < 300 ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.status}</span>
                  <span className="text-[var(--sea-ink-soft)]">{r.duration}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-xl font-semibold">curl Examples</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-semibold text-[var(--sea-ink)]">Signup:</p>
              <code className="block rounded bg-[var(--chip-line)] p-3 font-mono text-xs text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}'`}
              </code>
            </div>
            <div>
              <p className="mb-1 font-semibold text-[var(--sea-ink)]">Login:</p>
              <code className="block rounded bg-[var(--chip-line)] p-3 font-mono text-xs text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123"}'`}
              </code>
            </div>
            <div>
              <p className="mb-1 font-semibold text-[var(--sea-ink)]">Get Session (requires cookie):</p>
              <code className="block rounded bg-[var(--chip-line)] p-3 font-mono text-xs text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -b "alesha_auth=<token>" http://localhost:3000/auth/session`}
              </code>
            </div>
            <div>
              <p className="mb-1 font-semibold text-[var(--sea-ink)]">Logout:</p>
              <code className="block rounded bg-[var(--chip-line)] p-3 font-mono text-xs text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST -b "alesha_auth=<token>" http://localhost:3000/auth/logout`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
