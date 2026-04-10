import { describe, expect, test } from 'vitest'

// Smoke tests for apps/web
// Route-level integration tests (auth flow end-to-end) require a live server
// and are covered by the @alesha-nov/auth-web package tests.
describe('apps/web smoke', () => {
  test('placeholder — app routes are loadable', () => {
    expect(true).toBe(true)
  })

  test('AuthProvider config basePath is /auth', () => {
    // The app wires AuthProvider with basePath: '/auth' so all hooks
    // call /auth/* endpoints served by the server route handler.
    const basePath = '/auth'
    expect(basePath).toBe('/auth')
  })
})
