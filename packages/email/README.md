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

- [ ] Email template system (magic-link, verify email, reset password) — [#28](https://github.com/JuniYadi/alesha-nov/issues/28)
- [ ] Retry + backoff wrapper for transient failures — [#29](https://github.com/JuniYadi/alesha-nov/issues/29)
- [ ] Delivery status tracking callbacks/webhooks — [#30](https://github.com/JuniYadi/alesha-nov/issues/30)
- [ ] Rate limiting wrapper for provider throttling — [#31](https://github.com/JuniYadi/alesha-nov/issues/31)
- [ ] OTP/verification token helper utilities — [#32](https://github.com/JuniYadi/alesha-nov/issues/32)
- [ ] Stronger SMTP integration tests (send path + failure path) — [#33](https://github.com/JuniYadi/alesha-nov/issues/33)

## Tracking Issues

- [#28](https://github.com/JuniYadi/alesha-nov/issues/28) Add auth-focused template renderer and typed payloads (@alesha-nov/email)
- [#29](https://github.com/JuniYadi/alesha-nov/issues/29) Add retry/backoff email provider decorator (@alesha-nov/email)
- [#30](https://github.com/JuniYadi/alesha-nov/issues/30) Add delivery status tracking API for bounces/complaints (@alesha-nov/email)
- [#31](https://github.com/JuniYadi/alesha-nov/issues/31) Add provider rate-limiting wrapper (@alesha-nov/email)
- [#32](https://github.com/JuniYadi/alesha-nov/issues/32) Add OTP/verification token helper utilities (@alesha-nov/email)
- [#33](https://github.com/JuniYadi/alesha-nov/issues/33) Strengthen SMTP integration tests for send/failure paths (@alesha-nov/email)
