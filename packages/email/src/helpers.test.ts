import { describe, expect, test } from "bun:test";
import {
  generateOtp,
  generateVerificationToken,
  createTokenWithMetadata,
  withRetry,
  withRateLimit,
  templateRenderer,
  renderMagicLinkEmail,
  renderVerifyEmailEmail,
  renderResetPasswordEmail,
} from "./index";

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

describe("withRateLimit decorator", () => {
  const msg = { from: "a@a.com", to: "b@b.com", subject: "hi" };

  test("allows burst up to burstLimit", async () => {
    let calls = 0;
    const mock = { send: async () => ({ id: String(++calls) }) };
    const limited = withRateLimit(mock, { burstLimit: 3, refillRatePerSecond: 0 });
    // All 3 should succeed (no refill since rate=0)
    await expect(limited.send(msg)).resolves.toEqual({ id: "1" });
    await expect(limited.send(msg)).resolves.toEqual({ id: "2" });
    await expect(limited.send(msg)).resolves.toEqual({ id: "3" });
  });

  test("blocks when tokens exhausted with no refill", async () => {
    const mock = { send: async () => ({ id: "x" }) };
    const limited = withRateLimit(mock, { burstLimit: 1, refillRatePerSecond: 0 });
    await expect(limited.send(msg)).resolves.toEqual({ id: "x" });
    await expect(limited.send(msg)).rejects.toThrow("Rate limit exceeded");
  });

  test("refills tokens over time based on refillRatePerSecond", async () => {
    let calls = 0;
    const mock = { send: async () => ({ id: String(++calls) }) };
    const limited = withRateLimit(mock, { burstLimit: 1, refillRatePerSecond: 1000 });
    await expect(limited.send(msg)).resolves.toEqual({ id: "1" }); // burst exhausted
    // Wait ~50ms → ~50 tokens refilled (rate 1000/s), enough for 1 send
    await new Promise((r) => setTimeout(r, 60));
    await expect(limited.send(msg)).resolves.toEqual({ id: "2" });
  });
});

describe("template renderer", () => {
  test("replaces all {{key}} placeholders with data values", () => {
    const result = templateRenderer.render("Hello {{name}}, your code is {{code}}", {
      name: "Alice",
      code: "123456",
    });
    expect(result).toBe("Hello Alice, your code is 123456");
  });

  test("leaves unknown placeholders as-is", () => {
    const result = templateRenderer.render("Hi {{name}}, email: {{email}}", {
      name: "Bob",
    });
    expect(result).toBe("Hi Bob, email: {{email}}");
  });

  test("renders magic link email with correct subject and body", () => {
    const result = renderMagicLinkEmail({
      email: "bob@example.com",
      link: "https://app.example.com/auth/magic?token=abc",
      expiresInMinutes: 15,
    });
    expect(result.subject).toBe("Your Magic Link");
    expect(result.html).toContain("https://app.example.com/auth/magic?token=abc");
    expect(result.html).toContain("15");
    expect(result.text).toContain("https://app.example.com/auth/magic?token=abc");
  });

  test("renders verify email with code in subject and body", () => {
    const result = renderVerifyEmailEmail({
      email: "alice@example.com",
      code: "999888",
      expiresInMinutes: 5,
    });
    expect(result.subject).toBe("Verify Your Email");
    expect(result.html).toContain("999888");
    expect(result.html).toContain("5");
  });

  test("renders reset password with code in subject and body", () => {
    const result = renderResetPasswordEmail({
      email: "charlie@example.com",
      code: "112233",
      expiresInMinutes: 30,
    });
    expect(result.subject).toBe("Reset Your Password");
    expect(result.html).toContain("112233");
    expect(result.html).toContain("30");
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
