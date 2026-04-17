import { test, expect } from '@playwright/test'

const BASE = '/auth'

test.describe('API Auth Verification', () => {
  test('GET /auth/session without cookie returns 401', async ({ request }) => {
    const res = await request.get(`${BASE}/session`)
    expect(res.status()).toBe(401)
  })

  test('GET /auth/me without cookie returns 401', async ({ request }) => {
    const res = await request.get(`${BASE}/me`)
    expect(res.status()).toBe(401)
  })

  test('POST /auth/signup creates account and sets session cookie', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-signup${timestamp}@example.com`
    const res = await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Test' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
    const cookies = res.headers()['set-cookie']
    expect(cookies).toBeDefined()
  })

  test('POST /auth/login with valid credentials returns session', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-login${timestamp}@example.com`
    await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Login' },
    })

    const loginRes = await request.post(`${BASE}/login`, {
      data: { email, password: 'password123' },
    })
    expect(loginRes.status()).toBe(200)

    const setCookie = loginRes.headers()['set-cookie']
    expect(setCookie).toBeDefined()

    const cookieMatch = setCookie.match(/alesha_auth=[^;]+/)
    expect(cookieMatch).not.toBeNull()
    const sessionCookie = cookieMatch![0]

    const sessionRes = await request.get(`${BASE}/session`, {
      headers: { Cookie: sessionCookie },
    })
    expect(sessionRes.status()).toBe(200)
    const session = await sessionRes.json()
    expect(session).toBeDefined()
  })

  test('GET /auth/session with valid cookie returns 200 with session data', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-session${timestamp}@example.com`
    const signupRes = await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Session' },
    })

    const setCookie = signupRes.headers()['set-cookie']
    const cookieMatch = setCookie?.match(/alesha_auth=[^;]+/)
    const sessionCookie = cookieMatch![0]

    const res = await request.get(`${BASE}/session`, {
      headers: { Cookie: sessionCookie },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toBeDefined()
  })

  test('GET /auth/me with valid cookie returns 200 with user data', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-me${timestamp}@example.com`
    const signupRes = await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Me' },
    })

    const setCookie = signupRes.headers()['set-cookie']
    const cookieMatch = setCookie?.match(/alesha_auth=[^;]+/)
    const sessionCookie = cookieMatch![0]

    const res = await request.get(`${BASE}/me`, {
      headers: { Cookie: sessionCookie },
    })
    expect(res.status()).toBe(200)
    const user = await res.json()
    expect(user).toBeDefined()
    expect(user.email).toBe(email)
  })

  test('POST /auth/logout with valid cookie clears session', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-logout${timestamp}@example.com`
    const signupRes = await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Logout' },
    })

    const setCookie = signupRes.headers()['set-cookie']
    const cookieMatch = setCookie?.match(/alesha_auth=[^;]+/)
    const sessionCookie = cookieMatch![0]

    const logoutRes = await request.post(`${BASE}/logout`, {
      headers: { Cookie: sessionCookie },
    })
    expect(logoutRes.status()).toBe(200)

    const sessionRes = await request.get(`${BASE}/session`, {
      headers: { Cookie: sessionCookie },
    })
    expect(sessionRes.status()).toBe(401)
  })

  test('POST /auth/login with wrong password returns error', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-wrong${timestamp}@example.com`
    await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Wrong' },
    })

    const res = await request.post(`${BASE}/login`, {
      data: { email, password: 'wrongpassword' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /auth/signup with duplicate email returns error', async ({ request }) => {
    const timestamp = Date.now()
    const email = `api-dup${timestamp}@example.com`
    await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Dup' },
    })

    const res = await request.post(`${BASE}/signup`, {
      data: { email, password: 'password123', name: 'API Dup 2' },
    })
    expect(res.status()).toBe(409)
  })
})
