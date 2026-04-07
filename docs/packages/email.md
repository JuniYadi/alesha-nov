# @alesha-nov/email

Email delivery via **AWS SES** or **SMTP**. A thin, provider-agnostic wrapper around `@aws-sdk/client-ses` and `nodemailer`.

## Install

```json
{
  "@alesha-nov/email": "workspace:*"
}
```

```bash
bun add @alesha-nov/email
```

## EmailMessage

```ts
interface EmailMessage {
  from: string;
  to: string | string[];    // single address or array
  subject: string;
  html?: string;             // HTML body (preferred)
  text?: string;             // Plain text fallback
}
```

## EmailProvider Interface

```ts
interface EmailProvider {
  send(message: EmailMessage): Promise<{ id?: string }>;
}
```

## AWS SES Provider

```ts
import { createSesProvider } from "@alesha-nov/email";

const provider = createSesProvider({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

await provider.send({
  from: "noreply@alesha-nov.com",
  to: "yadi@example.com",
  subject: "Welcome!",
  html: "<h1>Hello Yadi</h1>",
  text: "Hello Yadi",
});
```

## SMTP Provider

```ts
import { createSmtpProvider } from "@alesha-nov/email";

const provider = createSmtpProvider({
  host: "smtp.example.com",
  port: 587,
  secure: false,             // true for port 465
  user: "apikey",
  pass: process.env.SMTP_PASS!,
});

await provider.send({
  from: "noreply@alesha-nov.com",
  to: ["yadi@example.com", "admin@alesha-nov.com"],
  subject: "Hello",
  html: "<p>Hi!</p>",
});
```

## Full Example: Welcome Email

```ts
import { createSesProvider } from "@alesha-nov/email";

const email = createSesProvider({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

async function sendWelcomeEmail(to: string, name: string) {
  return email.send({
    from: "noreply@alesha-nov.com",
    to,
    subject: "Welcome to Alesha!",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thanks for joining us.</p>
    `,
    text: `Welcome, ${name}! Thanks for joining us.`,
  });
}
```

## Provider Comparison

| Feature | SES | SMTP |
|---------|-----|------|
| Throughput | Very high | Moderate |
| Cost | Pay per use (AWS) | Varies |
| Setup | AWS credentials | Mail server creds |
| Portability | AWS-bound | Any SMTP server |
