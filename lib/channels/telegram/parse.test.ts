import { describe, expect, it } from "vitest";

import { parseTelegramUpdate } from "./parse";

describe("parseTelegramUpdate", () => {
  it("returns a message for a plain text update", () => {
    const result = parseTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        date: 1715000000,
        text: "oi",
        chat: { id: 42 },
        from: { id: 42, first_name: "Sam", username: "samuel" },
      },
    });
    expect(result.kind).toBe("message");
    if (result.kind === "message") {
      expect(result.incoming.externalUserId).toBe("42");
      expect(result.incoming.externalUserName).toBe("Sam");
      expect(result.incoming.text).toBe("oi");
      expect(result.incoming.receivedAt).toEqual(new Date(1715000000 * 1000));
    }
  });

  it("falls back to username when first_name missing", () => {
    const result = parseTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        date: 1715000000,
        text: "oi",
        chat: { id: 42 },
        from: { id: 42, username: "samuel" },
      },
    });
    if (result.kind !== "message") throw new Error("expected message");
    expect(result.incoming.externalUserName).toBe("samuel");
  });

  it("ignores updates without message", () => {
    const result = parseTelegramUpdate({ update_id: 1 });
    expect(result.kind).toBe("ignored");
  });

  it("ignores empty-text messages", () => {
    const result = parseTelegramUpdate({
      update_id: 1,
      message: { message_id: 1, date: 1, text: "   ", chat: { id: 1 } },
    });
    expect(result.kind).toBe("ignored");
  });

  it("ignores invalid payloads", () => {
    const result = parseTelegramUpdate({ garbage: true });
    expect(result.kind).toBe("ignored");
  });

  it("truncates user text longer than 2000 chars", () => {
    const longText = "a".repeat(3500);
    const result = parseTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        text: longText,
        chat: { id: 1 },
      },
    });
    if (result.kind !== "message") throw new Error("expected message");
    expect(result.incoming.text.length).toBe(2000);
  });
});
