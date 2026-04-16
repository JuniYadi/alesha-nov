# Packages

Verified against codebase (`/packages/*/src`) and synced with open GitHub issues.

| Package | Implemented (verified) | Missing / On-going (verified) | Tracking Issues |
|---|---|---|---|
| [@alesha-nov/config](config) | `JWTConfig` + `SessionConfig` types, session/JWT/magic-link/email/OAuth env resolvers | Keep env resolver docs and examples aligned | [#21](https://github.com/JuniYadi/alesha-nov/issues/21), [#22](https://github.com/JuniYadi/alesha-nov/issues/22) |
| [@alesha-nov/db](db) | DB type resolver, SQL client factory, migration runner, auth migration bundle export | Additional DB adapters (if needed) | [#21](https://github.com/JuniYadi/alesha-nov/issues/21), [#22](https://github.com/JuniYadi/alesha-nov/issues/22) |
| [@alesha-nov/auth](auth) | signup/login, magic-link issue/verify, OAuth login/link, linked accounts, roles, password reset flow, Node-compatible UUID fallback | session/JWT issuance + refresh contract, brute-force/rate-limit/lockout, password policy enforcement, OAuth PKCE authorize/callback abstraction, audit hooks/events | [#23](https://github.com/JuniYadi/alesha-nov/issues/23), [#24](https://github.com/JuniYadi/alesha-nov/issues/24), [#25](https://github.com/JuniYadi/alesha-nov/issues/25), [#26](https://github.com/JuniYadi/alesha-nov/issues/26), [#27](https://github.com/JuniYadi/alesha-nov/issues/27) |
| [@alesha-nov/email](email) | SES provider, SMTP provider, shared provider/message interface | template system, retry/backoff, delivery status tracking, rate limiter, OTP helpers, stronger SMTP tests | [#28](https://github.com/JuniYadi/alesha-nov/issues/28), [#29](https://github.com/JuniYadi/alesha-nov/issues/29), [#30](https://github.com/JuniYadi/alesha-nov/issues/30), [#31](https://github.com/JuniYadi/alesha-nov/issues/31), [#32](https://github.com/JuniYadi/alesha-nov/issues/32), [#33](https://github.com/JuniYadi/alesha-nov/issues/33) |
| [@alesha-nov/auth-web](auth-web) | auth routes, signed cookie session, password reset endpoints, OAuth login/link bridge routes, linked accounts, roles, Next/TanStack adapters | OAuth authorize/callback endpoints, email verification endpoints, CORS options, endpoint rate limiting, server-side session revocation | [#11](https://github.com/JuniYadi/alesha-nov/issues/11), [#34](https://github.com/JuniYadi/alesha-nov/issues/34), [#35](https://github.com/JuniYadi/alesha-nov/issues/35), [#36](https://github.com/JuniYadi/alesha-nov/issues/36), [#37](https://github.com/JuniYadi/alesha-nov/issues/37) |
| [@alesha-nov/auth-react](auth-react) | provider, `useAuth`, login/signup/logout hooks, password reset hooks, guard | OAuth hooks, magic-link hooks, session-expiry-aware refresh, pluggable navigation adapter | [#12](https://github.com/JuniYadi/alesha-nov/issues/12), [#38](https://github.com/JuniYadi/alesha-nov/issues/38), [#39](https://github.com/JuniYadi/alesha-nov/issues/39), [#40](https://github.com/JuniYadi/alesha-nov/issues/40) |

## Open Issue Index (Current)

- `#11, #12, #21–#40` are open and mapped above.
- `#41, #42` were closed as out-of-scope for this tracking pass.

Last verification source:
- `packages/config/src/index.ts`
- `packages/db/src/index.ts`
- `packages/auth/src/service.ts`, `packages/auth/src/utils.ts`
- `packages/email/src/index.ts`
- `packages/auth-web/src/index.ts`
- `packages/auth-react/src/hooks.ts`
- `packages/auth-react/src/context.tsx`
