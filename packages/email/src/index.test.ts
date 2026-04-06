import { describe, expect, test } from "bun:test";
import { createSmtpProvider } from "./index";

describe("email provider", () => {
  test("createSmtpProvider returns provider object", () => {
    const provider = createSmtpProvider({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "u",
      pass: "p",
    });

    expect(typeof provider.send).toBe("function");
  });
});
