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
