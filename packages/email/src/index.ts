import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";

export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id?: string }>;
}

export interface SesProviderOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SmtpProviderOptions {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export function createSesProvider(options: SesProviderOptions): EmailProvider {
  const client = new SESClient({
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  return {
    async send(message) {
      const toAddresses = Array.isArray(message.to) ? message.to : [message.to];

      const result = await client.send(
        new SendEmailCommand({
          Source: message.from,
          Destination: { ToAddresses: toAddresses },
          Message: {
            Subject: { Data: message.subject },
            Body: {
              Html: message.html ? { Data: message.html } : undefined,
              Text: message.text ? { Data: message.text } : undefined,
            },
          },
        })
      );

      return { id: result.MessageId };
    },
  };
}

export function createSmtpProvider(options: SmtpProviderOptions): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure ?? options.port === 465,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  });

  return {
    async send(message) {
      const info = await transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      return { id: info.messageId };
    },
  };
}

export function generateOtp(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

export function generateVerificationToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

export interface TokenWithMetadata {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
}

export function createTokenWithMetadata(token: string, ttlSeconds: number): TokenWithMetadata {
  return {
    token,
    ttlSeconds,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

// ── Template renderer ──────────────────────────────────────────────────────

export interface TemplateRenderer {
  render(template: string, data: Record<string, string>): string;
}

export interface MagicLinkPayload {
  email: string;
  link: string;
  expiresInMinutes: number;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
  expiresInMinutes: number;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  expiresInMinutes: number;
}

export const templateRenderer: TemplateRenderer = {
  render(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
  },
};

export function renderMagicLinkEmail(data: MagicLinkPayload): { subject: string; html: string; text: string } {
  return {
    subject: "Your Magic Link",
    html: templateRenderer.render(
      "<p>Hi,</p><p>Click <a href=\"{{link}}\">here</a> to sign in. This link expires in {{expiresInMinutes}} minutes.</p>",
      { link: data.link, expiresInMinutes: String(data.expiresInMinutes) }
    ),
    text: templateRenderer.render(
      "Hi,\n\nVisit this link to sign in: {{link}}\nExpires in {{expiresInMinutes}} minutes.",
      { link: data.link, expiresInMinutes: String(data.expiresInMinutes) }
    ),
  };
}

export function renderVerifyEmailEmail(data: VerifyEmailPayload): { subject: string; html: string; text: string } {
  return {
    subject: "Verify Your Email",
    html: templateRenderer.render(
      "<p>Hi,</p><p>Your verification code is: <strong>{{code}}</strong>. It expires in {{expiresInMinutes}} minutes.</p>",
      { code: data.code, expiresInMinutes: String(data.expiresInMinutes) }
    ),
    text: templateRenderer.render(
      "Hi,\n\nYour verification code: {{code}}\nExpires in {{expiresInMinutes}} minutes.",
      { code: data.code, expiresInMinutes: String(data.expiresInMinutes) }
    ),
  };
}

export function renderResetPasswordEmail(data: ResetPasswordPayload): { subject: string; html: string; text: string } {
  return {
    subject: "Reset Your Password",
    html: templateRenderer.render(
      "<p>Hi,</p><p>Your password reset code is: <strong>{{code}}</strong>. It expires in {{expiresInMinutes}} minutes.</p>",
      { code: data.code, expiresInMinutes: String(data.expiresInMinutes) }
    ),
    text: templateRenderer.render(
      "Hi,\n\nPassword reset code: {{code}}\nExpires in {{expiresInMinutes}} minutes.",
      { code: data.code, expiresInMinutes: String(data.expiresInMinutes) }
    ),
  };
}

export interface RateLimitOptions {
  burstLimit: number;       // max tokens in bucket (burst capacity)
  refillRatePerSecond: number; // sustained tokens per second
}

export function withRateLimit(provider: EmailProvider, options: RateLimitOptions): EmailProvider {
  let tokens = options.burstLimit;
  let lastRefill = Date.now();

  function refill() {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    const refilled = elapsed * options.refillRatePerSecond;
    tokens = Math.min(options.burstLimit, tokens + refilled);
    lastRefill = now;
  }

  return {
    async send(message) {
      refill();
      if (tokens < 1) {
        throw new Error("Rate limit exceeded: burst capacity exhausted");
      }
      tokens -= 1;
      return provider.send(message);
    },
  };
}

export function withRetry(provider: EmailProvider, options: RetryOptions): EmailProvider {
  const shouldRetry = options.shouldRetry ?? (() => true);

  return {
    async send(message) {
      let attempt = 0;
      let lastError: unknown;

      while (attempt < options.maxAttempts) {
        try {
          return await provider.send(message);
        } catch (error) {
          lastError = error;
          attempt++;

          if (attempt >= options.maxAttempts || !shouldRetry(error)) {
            break;
          }

          const delay = Math.min(
            options.maxDelayMs,
            options.initialDelayMs * Math.pow(2, attempt - 1)
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    },
  };
}
