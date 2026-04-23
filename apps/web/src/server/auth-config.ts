import { resolveSessionConfig, resolveJWTSecret } from '@alesha-nov/config'

export function resolveSessionSecret(): string {
  return resolveJWTSecret()
}

export function resolveSecureCookie(): boolean {
  return resolveSessionConfig().secure
}
