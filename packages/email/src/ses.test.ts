import { beforeEach, describe, expect, mock, test } from "bun:test";

const sendCalls: unknown[] = [];

class FakeSendEmailCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

class FakeSesClient {
  constructor(_: unknown) {}

  async send(command: FakeSendEmailCommand) {
    sendCalls.push(command.input);
    return { MessageId: "ses-msg-1" };
  }
}

mock.module("@aws-sdk/client-ses", () => ({
  SESClient: FakeSesClient,
  SendEmailCommand: FakeSendEmailCommand,
}));

const { createSesProvider } = await import("./index");

beforeEach(() => {
  sendCalls.length = 0;
});

describe("createSesProvider", () => {
  test("normalizes single recipient and returns message id", async () => {
    const provider = createSesProvider({
      region: "ap-southeast-1",
      accessKeyId: "key",
      secretAccessKey: "secret",
    });

    const result = await provider.send({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "Hello",
      text: "Body",
    });

    expect(result).toEqual({ id: "ses-msg-1" });
    expect(sendCalls.length).toBe(1);
    const input = sendCalls[0] as { Destination: { ToAddresses: string[] }; Message: { Body: { Text?: { Data: string } } } };
    expect(input.Destination.ToAddresses).toEqual(["user@example.com"]);
    expect(input.Message.Body.Text?.Data).toBe("Body");
  });

  test("keeps array recipients and supports html body", async () => {
    const provider = createSesProvider({
      region: "ap-southeast-1",
      accessKeyId: "key",
      secretAccessKey: "secret",
    });

    await provider.send({
      from: "noreply@example.com",
      to: ["a@example.com", "b@example.com"],
      subject: "Hello",
      html: "<b>Body</b>",
    });

    const input = sendCalls[0] as { Destination: { ToAddresses: string[] }; Message: { Body: { Html?: { Data: string } } } };
    expect(input.Destination.ToAddresses).toEqual(["a@example.com", "b@example.com"]);
    expect(input.Message.Body.Html?.Data).toBe("<b>Body</b>");
  });
});
