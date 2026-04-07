import { describe, expect, test } from "bun:test";
import { createTanstackAuthHandler } from "./tanstack";

const authService = {
  signup: async () => {
    throw new Error("not implemented");
  },
  login: async () => null,
  issueMagicLinkToken: async () => "",
  verifyMagicLinkToken: async () => null,
  setUserRoles: async () => [],
  getUserRoles: async () => [],
  loginWithOAuth: async () => {
    throw new Error("not implemented");
  },
  linkOAuthAccount: async () => {
    throw new Error("not implemented");
  },
  getLinkedAccounts: async () => [],
};

describe("createTanstackAuthHandler", () => {
  test("returns handler function", async () => {
    const handler = createTanstackAuthHandler({
      authService,
      sessionSecret: "0123456789abcdef",
    });

    expect(typeof handler).toBe("function");

    const response = await handler(new Request("http://localhost/auth/unknown", { method: "GET" }));
    expect(response.status).toBe(404);
  });
});
