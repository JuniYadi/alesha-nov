import { describe, expect, test } from "bun:test";
import { generateOtp, generateVerificationToken, createTokenWithMetadata } from "./index";

describe("email helpers", () => {
  test("generateOtp produces numeric string of correct length", () => {
    const otp = generateOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
    expect(generateOtp(4)).toMatch(/^\d{4}$/);
  });

  test("generateVerificationToken produces alphanumeric string of correct length", () => {
    const token = generateVerificationToken(32);
    expect(token).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(generateVerificationToken(16)).toMatch(/^[A-Za-z0-9]{16}$/);
  });

  test("createTokenWithMetadata returns expected structure and expiry", () => {
    const now = Date.now();
    const result = createTokenWithMetadata("abc", 60);
    expect(result.token).toBe("abc");
    expect(result.ttlSeconds).toBe(60);
    const expiry = new Date(result.expiresAt).getTime();
    expect(expiry).toBeGreaterThanOrEqual(now + 60000);
    expect(expiry).toBeLessThanOrEqual(now + 61000);
  });
});
