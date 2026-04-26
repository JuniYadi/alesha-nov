---
"@alesha-nov/auth": minor
---

Configure rate limiting and CORS in auth handler

- Add IP-based rate limiting (100 req/60s) via x-forwarded-for/x-real-ip
- Add CORS configuration reading from ALLOWED_ORIGINS env var
- Closes #83, #84
