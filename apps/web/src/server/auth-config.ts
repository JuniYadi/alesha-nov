const DEFAULT_DEV_SESSION_SECRET = 'dev-session-secret-change-me'

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim()
  if (fromEnv) return fromEnv

  if (isProductionEnv()) {
    throw new Error('SESSION_SECRET is required in production')
  }

  return DEFAULT_DEV_SESSION_SECRET
}

export function resolveSecureCookie(): boolean {
  const raw = process.env.AUTH_SECURE_COOKIE?.trim().toLowerCase()

  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false

  return isProductionEnv()
}
