import {
  createSesProvider,
  createSmtpProvider,
  dispatchDeliveryStatusEvent,
  renderMagicLinkEmail,
  renderResetPasswordEmail,
  type DeliveryStatusCallback,
  type EmailProvider,
  withRateLimit,
  withRetry,
} from '@alesha-nov/email'
import { resolveEmailTransportConfig, resolveMagicLinkConfig } from '@alesha-nov/config'
import type { AuthEmailOptions, AuthEmailDeliveryContext } from '@alesha-nov/auth'

const DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  shouldRetry: () => true,
}

const DEFAULT_RATE_LIMIT_OPTIONS = {
  burstLimit: 10,
  refillRatePerSecond: 5,
}

function extractFirstRecipient(to: string | string[]): string {
  if (Array.isArray(to)) {
    return to[0] ?? ''
  }

  return to
}

function minutesFromSeconds(ttlSeconds: number): number {
  return Math.max(1, Math.ceil(ttlSeconds / 60))
}

function createDeliveryStatusLogger(provider: string): DeliveryStatusCallback {
  return async (event) => {
    if (event.status === 'bounced' || event.status === 'complained') {
      console.warn(`Email delivery ${event.status} (${provider})`, {
        messageId: event.messageId,
        recipient: event.recipient,
        reason: event.reason,
      })
      return
    }

    return
  }
}

function withDeliveryEvents(provider: EmailProvider, type: 'ses' | 'smtp', callback?: DeliveryStatusCallback): EmailProvider {
  const onDeliveryStatus = callback ?? createDeliveryStatusLogger(type)

  return {
    async send(message) {
      const recipient = extractFirstRecipient(message.to)

      try {
        const result = await provider.send(message)

        await dispatchDeliveryStatusEvent(
          {
            provider: type,
            status: 'delivered',
            messageId: result.id,
            recipient,
            timestamp: new Date().toISOString(),
            raw: { provider: type, message, result },
          },
          onDeliveryStatus,
        )

        return result
      } catch (error) {
        await dispatchDeliveryStatusEvent(
          {
            provider: type,
            status: 'rejected',
            recipient,
            reason: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            raw: { provider: type, message, error },
          },
          onDeliveryStatus,
        )

        throw error
      }
    },
  }
}

export function createAuthEmailOptions(): AuthEmailOptions | undefined {
  const transportConfig = resolveEmailTransportConfig()
  if (!transportConfig) {
    return undefined
  }

  const { sender } = resolveMagicLinkConfig()
  let provider: EmailProvider

  if (transportConfig.type === 'ses') {
    const { ses } = transportConfig
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_KEY

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing SES credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
    }

    provider = createSesProvider({
      region: ses!.region,
      accessKeyId,
      secretAccessKey,
    })
  } else {
    const { smtp } = transportConfig
    provider = createSmtpProvider({
      host: smtp!.host,
      port: smtp!.port,
      secure: smtp!.secure,
      user: smtp!.username ?? '',
      pass: smtp!.password ?? '',
    })
  }

  const wrappedProvider = withRateLimit(
    withRetry(withDeliveryEvents(provider, transportConfig.type), DEFAULT_RETRY_OPTIONS),
    DEFAULT_RATE_LIMIT_OPTIONS,
  )

  return {
    provider: wrappedProvider,
    from: sender,
    magicLink: {
      render(context: AuthEmailDeliveryContext) {
        return renderMagicLinkEmail({
          email: context.email,
          link: context.token,
          expiresInMinutes: minutesFromSeconds(context.ttlSeconds),
        })
      },
    },
    passwordReset: {
      render(context: AuthEmailDeliveryContext) {
        return renderResetPasswordEmail({
          email: context.email,
          code: context.token,
          expiresInMinutes: minutesFromSeconds(context.ttlSeconds),
        })
      },
    },
  }
}
