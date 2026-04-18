---
"@alesha-nov/auth": patch
"@alesha-nov/auth-web": patch
"@alesha-nov/config": patch
---

Allow missing users to receive magic links by auto-creating accounts, wire magic-link email URLs to app origin, and reuse that link path for verification redirects.

Also update the login demo page so the magic-link request input is separate from the password-login email field to avoid confusion.
