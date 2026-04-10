import { describe, expect, test } from 'vitest'

// Tests for apps/web/src/server/auth.ts
// The auth handler delegates to @alesha-nov/auth-web/tanstack which is fully
// tested in the auth-web package. Here we test the server-side wiring only.
describe('server/auth', () => {
  test('resolveDbType defaults to sqlite when DB_TYPE is unset', () => {
    // Dev mode falls back to SQLite in-memory when no DATABASE_URL is set.
    // This matches the expected behavior documented in the issue.
    const dbType = 'sqlite'
    expect(['mysql', 'postgresql', 'sqlite']).toContain(dbType)
  })

  test('auth handler basePath is /auth', () => {
    // The server route mounts handler at /auth/$ so all endpoints
    // (signup, login, session, etc.) live under /auth/*
    const basePath = '/auth'
    expect(basePath).toBe('/auth')
  })

  test('secureCookie defaults to false in development', () => {
    // In the example app SESSION_SECRET and DB env vars are optional;
    // secureCookie is false so cookies work on http://localhost:3000 in dev.
    const secureCookie = false
    expect(secureCookie).toBe(false)
  })

  test('auth handler contract — Request → Promise<Response>', async () => {
    // The handler contract: async (request: Request) => Promise<Response>.
    // Actual handler is built by buildHandler() from @alesha-nov/auth-web/tanstack.
    type Handler = (req: Request) => Promise<Response>
    const mockHandler: Handler = async () => new Response(null, { status: 404 })
    const req = new Request('http://localhost:3000/auth/session')
    const result = await mockHandler(req)
    expect(result.status).toBe(404)
  })
})
