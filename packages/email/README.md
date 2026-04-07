# @alesha-nov/email

Provider-agnostic email delivery package (AWS SES + SMTP).

## Implemented Features

- `createSesProvider()` using `@aws-sdk/client-ses`
- `createSmtpProvider()` using `nodemailer`
- Shared `EmailProvider` interface with `send(message)`
- Shared `EmailMessage` payload type (`from`, `to`, `subject`, `html?`, `text?`)

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Send magic-link emails reliably
- Send verification and reset-password emails
- Support transactional template payloads

## Missing / On-going (Track Here)

- [ ] Email template system (magic-link, verify email, reset password)
- [ ] Retry + backoff wrapper for transient failures
- [ ] Delivery status tracking callbacks/webhooks
- [ ] Rate limiting wrapper for provider throttling
- [ ] OTP/verification token helper utilities
- [ ] Stronger SMTP integration tests (send path + failure path)

## Suggested GitHub Issues

1. Add auth-focused template renderer + typed template payloads
2. Add retry/backoff email provider decorator
3. Add delivery status and bounce/complaint mapping API
4. Add provider rate limiter wrapper
5. Add OTP/verification helper module
6. Upgrade SMTP tests to integration-style send assertions
