import { describe, expect, test } from "bun:test";
import { createNextAuthHandlers } from "./next";

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

describe("createNextAuthHandlers", () => {
  test("returns handler methods for HTTP verbs", async () => {
    const handlers = createNextAuthHandlers({
      authService,
      sessionSecret: "0123456789abcdef",
    });

    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
    expect(typeof handlers.PUT).toBe("function");
    expect(typeof handlers.DELETE).toBe("function");
    expect(typeof handlers.PATCH).toBe("function");
  });
});
