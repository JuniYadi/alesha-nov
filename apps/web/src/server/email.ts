import { resolveEmailTransportConfig, resolveMagicLinkConfig } from '@alesha-nov/config'
import {
  createSesProvider,
  createSmtpProvider,
  withRetry,
  withRateLimit,
  type EmailProvider,
} from '@alesha-nov/email'

export interface AuthEmailOptions {
  provider: EmailProvider
  from: string
}

export function createAuthEmailOptions(): AuthEmailOptions | undefined {
  const transportConfig = resolveEmailTransportConfig()
  if (!transportConfig) return undefined

  let provider: EmailProvider

  if (transportConfig.type === 'ses') {
    provider = createSesProvider({
      region: transportConfig.ses!.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    })
  } else {
    provider = createSmtpProvider({
      host: transportConfig.smtp!.host,
      port: transportConfig.smtp!.port,
      secure: transportConfig.smtp!.secure,
      user: transportConfig.smtp!.username ?? '',
      pass: transportConfig.smtp!.password ?? '',
    })
  }

  provider = withRetry(provider, {
    maxAttempts: 3,
    initialDelayMs: 200,
    maxDelayMs: 5000,
  })

  provider = withRateLimit(provider, {
    burstLimit: 10,
    refillRatePerSecond: 1,
  })

  let from: string
  try {
    from = resolveMagicLinkConfig().sender
  } catch {
    from = process.env.AUTH_EMAIL_FROM ?? process.env.EMAIL_FROM ?? 'noreply@example.com'
  }

  return { provider, from }
}
