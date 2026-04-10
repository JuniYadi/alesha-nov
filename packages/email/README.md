# @alesha-nov/email

Provider-agnostic email delivery package (AWS SES + SMTP) plus auth-focused helper utilities.

## Implemented Features

- `createSesProvider()` using `@aws-sdk/client-ses`
- `createSmtpProvider()` using `nodemailer`
- Shared `EmailProvider` interface with `send(message)`
- Shared `EmailMessage` payload type (`from`, `to`, `subject`, `html?`, `text?`)
- Auth template rendering utilities:
  - `renderMagicLinkEmail`
  - `renderVerifyEmailEmail`
  - `renderResetPasswordEmail`
  - `renderAuthTemplate`
- Retry/backoff utilities (`withRetry`, backoff helpers)
- Delivery status mapping/dispatch helpers (SES/SMTP)
- Rate-limiting provider decorator (`withRateLimit`)
- OTP/verification token generators + metadata helpers

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Send magic-link emails reliably
- Send verification and reset-password emails
- Support transactional template payloads
- Handle transient provider failures and throttling safely

## Remaining / Follow-up

- Expand end-to-end provider integration coverage beyond current tests
- Add cookbook examples for provider webhooks/feedback loops

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #28/#29/#30/#31/#32/#33 are closed.
