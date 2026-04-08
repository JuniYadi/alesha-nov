import { beforeEach, describe, expect, mock, test } from "bun:test";

const sentMails: unknown[] = [];

class FakeTransport {
  constructor() {}

  async sendMail(input: unknown) {
    sentMails.push(input);
    return { messageId: "smtp-msg-1" };
  }
}

mock.module("nodemailer", () => ({
  default: {
    createTransport: () => new FakeTransport(),
  },
}));

const { createSmtpProvider } = await import("./index");

beforeEach(() => {
  sentMails.length = 0;
});

describe("createSmtpProvider", () => {
  test("sends message with correct fields and returns message id", async () => {
    const provider = createSmtpProvider({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      user: "user",
      pass: "pass",
    });

    const result = await provider.send({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "Hello",
      text: "Plain body",
      html: "<p>HTML body</p>",
    });

    expect(result).toEqual({ id: "smtp-msg-1" });
    expect(sentMails.length).toBe(1);
    const mail = sentMails[0] as Record<string, unknown>;
    expect(mail.from).toBe("noreply@example.com");
    expect(mail.to).toBe("user@example.com");
    expect(mail.subject).toBe("Hello");
    expect(mail.text).toBe("Plain body");
    expect(mail.html).toBe("<p>HTML body</p>");
  });

  test("normalizes array of recipients into nodemailer format", async () => {
    const provider = createSmtpProvider({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "user",
      pass: "pass",
    });

    await provider.send({
      from: "noreply@example.com",
      to: ["a@example.com", "b@example.com"],
      subject: "Bulk",
      text: "Body",
    });

    expect(sentMails.length).toBe(1);
    const mail = sentMails[0] as Record<string, unknown>;
    expect(mail.to).toEqual(["a@example.com", "b@example.com"]);
  });

  test("throws when SMTP send fails", async () => {
    mock.module("nodemailer", () => ({
      default: {
        createTransport: () => ({
          async sendMail() {
            throw new Error("SMTP connection refused");
          },
        }),
      },
    }));

    // Re-import to get fresh provider with mocked failure transport
    const { createSmtpProvider: _fp } = await import("./index");
    const provider = _fp({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "user",
      pass: "pass",
    });

    await expect(
      provider.send({ from: "a@a.com", to: "b@b.com", subject: "Hi", text: "Body" })
    ).rejects.toThrow("SMTP connection refused");
  });
});