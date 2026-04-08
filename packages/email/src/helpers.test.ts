import { describe, expect, test } from "bun:test";
import { generateOtp, generateVerificationToken, createTokenWithMetadata, withRetry } from "./index";

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

describe("withRetry decorator", () => {
  const message = { from: "a@a.com", to: "b@b.com", subject: "hi" };

  test("returns result directly if first call succeeds", async () => {
    const mock = { send: async () => ({ id: "123" }) };
    const retrier = withRetry(mock, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10 });
    const res = await retrier.send(message);
    expect(res.id).toBe("123");
  });

  test("retries on failure up to maxAttempts", async () => {
    let calls = 0;
    const mock = {
      send: async () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return { id: "ok" };
      },
    };
    const retrier = withRetry(mock, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10 });
    const res = await retrier.send(message);
    expect(res.id).toBe("ok");
    expect(calls).toBe(3);
  });

  test("throws final error if all attempts fail", async () => {
    let calls = 0;
    const mock = {
      send: async () => {
        calls++;
        throw new Error(`fail-${calls}`);
      },
    };
    const retrier = withRetry(mock, { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 10 });
    await expect(retrier.send(message)).rejects.toThrow("fail-2");
    expect(calls).toBe(2);
  });

  test("stops retrying if shouldRetry returns false", async () => {
    let calls = 0;
    const mock = {
      send: async () => {
        calls++;
        throw new Error("fatal");
      },
    };
    const retrier = withRetry(mock, {
      maxAttempts: 5,
      initialDelayMs: 1,
      maxDelayMs: 10,
      shouldRetry: (e) => e.message !== "fatal",
    });
    await expect(retrier.send(message)).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });
});
