import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { OAuthProvider } from "./types";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeRoles(roles: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of roles) {
    const role = raw.trim().toLowerCase();
    if (!role) continue;
    if (!/^[a-z0-9]+[a-z0-9._-]*$/.test(role)) {
      throw new Error(`Invalid role format: ${raw}`);
    }
    if (seen.has(role)) continue;
    seen.add(role);
    out.push(role);
  }

  return out;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const inputDigest = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(inputDigest, "hex"));
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newId(): string {
  return Bun.randomUUIDv7();
}

export function assertProvider(provider: string): asserts provider is OAuthProvider {
  if (provider !== "google" && provider !== "github") {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}
