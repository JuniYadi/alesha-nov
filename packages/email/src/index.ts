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
