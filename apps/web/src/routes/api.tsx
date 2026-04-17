import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@alesha-nov/auth-react'

export const Route = createFileRoute('/api')({ component: ApiPage })

const BASE = '/auth'

interface ApiResult {
  method: string
  path: string
  status: number
  body: unknown
  duration: number
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function StatusBadge({ status }: { status: number }) {
  const ok = status >= 200 && status < 300
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {status}
    </span>
  )
}

function MethodBadge({ method }: { method: string }) {
  const cls = method === 'GET' ? 'bg-emerald-100 text-emerald-700'
    : method === 'POST' ? 'bg-blue-100 text-blue-700'
    : method === 'PUT' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${cls}`}>{method}</span>
}

function ResultDisplay({ result }: { result: ApiResult | null }) {
  if (!result) return null
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <StatusBadge status={result.status} />
        <span className="text-[var(--sea-ink-soft)]">{result.duration}ms</span>
      </div>
      <JsonBlock data={result.body} />
    </div>
  )
}

function ExampleResponse({ label, status, body }: { label: string; status: number; body: unknown }) {
  return (
    <div className="rounded border border-[var(--line)] bg-[var(--surface)]">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-[var(--sea-ink)]"
        onClick={(e) => {
          const content = e.currentTarget.nextElementSibling!
          content.classList.toggle('hidden')
        }}
      >
        <span>{label}</span>
        <StatusBadge status={status} />
      </button>
      <div className="hidden border-t border-[var(--line)] px-3 py-2">
        <JsonBlock data={body} />
      </div>
    </div>
  )
}

type TabId = 'auth' | 'session' | 'magic-link' | 'curl'

const TABS: { id: TabId; label: string }[] = [
  { id: 'auth', label: 'Auth' },
  { id: 'session', label: 'Session' },
  { id: 'magic-link', label: 'Magic Link' },
  { id: 'curl', label: 'cURL' },
]

function ApiPage() {
  const { status, user, refetch } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('auth')
  const [loading, setLoading] = useState(false)
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupResult, setSignupResult] = useState<ApiResult | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginResult, setLoginResult] = useState<ApiResult | null>(null)

  const [sessionResult, setSessionResult] = useState<ApiResult | null>(null)
  const [meResult, setMeResult] = useState<ApiResult | null>(null)
  const [logoutResult, setLogoutResult] = useState<ApiResult | null>(null)

  const [magicEmail, setMagicEmail] = useState('')
  const [magicToken, setMagicToken] = useState('')
  const [magicRequestResult, setMagicRequestResult] = useState<ApiResult | null>(null)
  const [magicVerifyResult, setMagicVerifyResult] = useState<ApiResult | null>(null)

  const request = useCallback(async (
    method: string,
    path: string,
    body?: unknown,
    setResult?: (r: ApiResult) => void,
  ) => {
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
      const result: ApiResult = { method, path, status: res.status, body: resBody, duration: Date.now() - start }
      setResult(result)

      if (path === '/signup' || path === '/login' || path === '/magic-link/verify' || path === '/logout') {
        refetchRef.current()
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      request('GET', '/session', undefined, setSessionResult)
    }
  }, [status, request])

  const isAuthenticated = status === 'authenticated'
  const inputCls = 'w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]'
  const btnCls = 'rounded-md border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)] disabled:opacity-50'
  const sectionTitleCls = 'mb-4 text-lg font-semibold text-[var(--sea-ink)]'

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="island-shell rounded-2xl p-6">
          <h1 className="display-title mb-2 text-3xl font-bold">API Playground</h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Test auth API endpoints from the browser. Auth state is shared with the app.
          </p>
        </div>

        <div className={`island-shell rounded-2xl p-5 ${isAuthenticated ? '' : 'border-amber-300 dark:border-amber-700'}`}>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
              isAuthenticated ? 'bg-emerald-50 text-emerald-700' :
              status === 'loading' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-600'
            }`}>
              {isAuthenticated ? 'Authenticated' : status === 'loading' ? 'Loading...' : 'Not authenticated'}
            </span>
            {user && <span className="text-sm text-[var(--sea-ink-soft)]">{user.email}</span>}
          </div>
          {!isAuthenticated && status !== 'loading' && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Protected endpoints will return 401 Unauthorized. Use the Auth tab to sign up or log in first.
            </p>
          )}
        </div>

        <div>
          <div className="island-shell rounded-t-2xl border-b-0 p-1">
            <nav className="flex gap-1" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--surface-strong)] text-[var(--sea-ink)] shadow-sm'
                      : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="island-shell rounded-b-2xl rounded-t-0 p-6" role="tabpanel">
            {activeTab === 'auth' && (
              <div className="space-y-6">
                <div>
                  <h3 className={sectionTitleCls}>Sign Up</h3>
                  <div className="space-y-2">
                    <input className={inputCls} placeholder="Name" value={signupName} onChange={e => setSignupName(e.target.value)} />
                    <input className={inputCls} placeholder="Email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                    <input className={inputCls} placeholder="Password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                    <button
                      className={btnCls}
                      onClick={() => request('POST', '/signup', { email: signupEmail, password: signupPassword, name: signupName }, setSignupResult)}
                      disabled={loading || !signupEmail || !signupPassword}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={signupResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Success" status={200} body={{ user: { id: 'usr_abc123', email: 'alice@example.com', name: 'Alice', image: null, emailVerifiedAt: null, roles: ['user'], createdAt: '2026-04-18T12:00:00.000Z' } }} />
                    <ExampleResponse label="Already exists" status={400} body={{ error: 'User already exists' }} />
                  </div>
                </div>

                <div>
                  <h3 className={sectionTitleCls}>Log In</h3>
                  <div className="space-y-2">
                    <input className={inputCls} placeholder="Email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                    <input className={inputCls} placeholder="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button
                      className={btnCls}
                      onClick={() => request('POST', '/login', { email: loginEmail, password: loginPassword }, setLoginResult)}
                      disabled={loading || !loginEmail || !loginPassword}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={loginResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Success" status={200} body={{ user: { id: 'usr_abc123', email: 'alice@example.com', name: 'Alice', image: null, emailVerifiedAt: null, roles: ['user'], createdAt: '2026-04-18T12:00:00.000Z' } }} />
                    <ExampleResponse label="Invalid credentials" status={401} body={{ error: 'Invalid credentials' }} />
                  </div>
                </div>

                <div>
                  <h3 className={sectionTitleCls}>Log Out</h3>
                  <div className="space-y-2">
                    <button
                      className={btnCls}
                      onClick={() => request('POST', '/logout', undefined, setLogoutResult)}
                      disabled={loading}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={logoutResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Success (always 200)" status={200} body={{ ok: true }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'session' && (
              <div className="space-y-6">
                <div>
                  <h3 className={sectionTitleCls}>Get Session</h3>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    <MethodBadge method="GET" /> <code className="text-sm font-semibold text-[var(--sea-ink)]">/auth/session</code>
                    <span className="ml-2 rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">requires auth</span>
                  </p>
                  <div className="space-y-2">
                    <button
                      className={btnCls}
                      onClick={() => request('GET', '/session', undefined, setSessionResult)}
                      disabled={loading}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={sessionResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Authenticated" status={200} body={{ session: { userId: 'usr_abc123', sessionId: 'ses_xyz789', email: 'alice@example.com', roles: ['user'], exp: 1745020800 } }} />
                    <ExampleResponse label="Unauthorized (no/invalid cookie)" status={401} body={{ error: 'Unauthorized' }} />
                  </div>
                </div>

                <div>
                  <h3 className={sectionTitleCls}>Get Current User</h3>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    <MethodBadge method="GET" /> <code className="text-sm font-semibold text-[var(--sea-ink)]">/auth/me</code>
                    <span className="ml-2 rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">requires auth</span>
                  </p>
                  <div className="space-y-2">
                    <button
                      className={btnCls}
                      onClick={() => request('GET', '/me', undefined, setMeResult)}
                      disabled={loading}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={meResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Authenticated" status={200} body={{ user: { id: 'usr_abc123', email: 'alice@example.com', name: 'Alice', image: null, emailVerifiedAt: null, roles: ['user'], createdAt: '2026-04-18T12:00:00.000Z' } }} />
                    <ExampleResponse label="Unauthorized" status={401} body={{ error: 'Unauthorized' }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'magic-link' && (
              <div className="space-y-6">
                <div>
                  <h3 className={sectionTitleCls}>Request Magic Link</h3>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    <MethodBadge method="POST" /> <code className="text-sm font-semibold text-[var(--sea-ink)]">/auth/magic-link/request</code>
                    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">public</span>
                  </p>
                  <div className="space-y-2">
                    <input className={inputCls} placeholder="Email" type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} />
                    <button
                      className={btnCls}
                      onClick={() => request('POST', '/magic-link/request', { email: magicEmail }, setMagicRequestResult)}
                      disabled={loading || !magicEmail}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={magicRequestResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Email sent" status={200} body={{ sent: true }} />
                    <ExampleResponse label="Rate limited" status={429} body={{ error: 'Too many requests' }} />
                  </div>
                </div>

                <div>
                  <h3 className={sectionTitleCls}>Verify Magic Link</h3>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    <MethodBadge method="POST" /> <code className="text-sm font-semibold text-[var(--sea-ink)]">/auth/magic-link/verify</code>
                    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">public</span>
                  </p>
                  <div className="space-y-2">
                    <input className={inputCls} placeholder="Token from /magic-link/request" value={magicToken} onChange={e => setMagicToken(e.target.value)} />
                    <button
                      className={btnCls}
                      onClick={() => request('POST', '/magic-link/verify', { token: magicToken }, setMagicVerifyResult)}
                      disabled={loading || !magicToken}
                    >
                      Send Request
                    </button>
                    <ResultDisplay result={magicVerifyResult} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">Example Responses</p>
                    <ExampleResponse label="Verified" status={200} body={{ user: { id: 'usr_abc123', email: 'alice@example.com', name: 'Alice', image: null, emailVerifiedAt: '2026-04-18T12:00:00.000Z', roles: ['user'], createdAt: '2026-04-18T12:00:00.000Z' } }} />
                    <ExampleResponse label="Invalid/expired token" status={401} body={{ error: 'Invalid or expired token' }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'curl' && (
              <div className="space-y-5">
                <h3 className={sectionTitleCls}>cURL Examples</h3>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Signup</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}'`}
                  </pre>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Login</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com","password":"secret123"}'`}
                  </pre>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Get Session (requires cookie)</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -b "alesha_auth=<token>" http://localhost:3000/auth/session`}
                  </pre>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Logout</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST -b "alesha_auth=<token>" http://localhost:3000/auth/logout`}
                  </pre>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Magic Link Request</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/magic-link/request \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@example.com"}'`}
                  </pre>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">Magic Link Verify</p>
                  <pre className="overflow-auto rounded bg-[var(--chip-line)] p-3 text-xs font-mono text-[var(--sea-ink)] whitespace-pre-wrap break-all">
{`curl -X POST http://localhost:3000/auth/magic-link/verify \\
  -H "Content-Type: application/json" \\
  -d '{"token":"<token_from_request>"}'`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
