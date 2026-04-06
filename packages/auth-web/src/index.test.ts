import { describe, expect, test } from "bun:test";
import { createAuthWeb } from "./index";

describe("createAuthWeb", () => {
  test("throws when sessionSecret is too short", () => {
    expect(() =>
      createAuthWeb({
        sessionSecret: "short",
        authService: {
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
        },
      })
    ).toThrow();
  });
});
