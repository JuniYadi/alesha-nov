---
"@alesha-nov/config": patch
---

Fix Node compatibility in `@alesha-nov/config` by moving Bun SQL resolution to runtime so importing the package in non-Bun test environments no longer tries to resolve `bun` at module load.

This unblocks environment-only usage such as auth-session config helpers in web tests.
