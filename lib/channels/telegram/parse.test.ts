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

  describe("business_connection lifecycle", () => {
    it("parses a connect event with rights.can_reply", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_connection: {
          id: "conn_xyz",
          user: { id: 12345, first_name: "Owner", username: "owner_handle" },
          user_chat_id: 12345,
          date: 1715000000,
          is_enabled: true,
          rights: { can_reply: true, can_read_messages: true },
        },
      });
      if (result.kind !== "business_connection") {
        throw new Error("expected business_connection");
      }
      expect(result.connection.businessConnectionId).toBe("conn_xyz");
      expect(result.connection.ownerUserId).toBe(12345);
      expect(result.connection.ownerUsername).toBe("owner_handle");
      expect(result.connection.canReply).toBe(true);
      expect(result.connection.canRead).toBe(true);
      expect(result.connection.isEnabled).toBe(true);
      expect(result.connection.connectedAt).toEqual(new Date(1715000000 * 1000));
    });

    it("falls back to legacy top-level can_reply when rights is absent", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_connection: {
          id: "conn_legacy",
          user: { id: 1, first_name: "X" },
          date: 1,
          is_enabled: true,
          can_reply: true,
        },
      });
      if (result.kind !== "business_connection") {
        throw new Error("expected business_connection");
      }
      expect(result.connection.canReply).toBe(true);
      expect(result.connection.canRead).toBe(false);
    });

    it("captures disconnect with is_enabled=false", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_connection: {
          id: "conn_off",
          user: { id: 1, first_name: "X" },
          date: 1,
          is_enabled: false,
          rights: {},
        },
      });
      if (result.kind !== "business_connection") {
        throw new Error("expected business_connection");
      }
      expect(result.connection.isEnabled).toBe(false);
      expect(result.connection.canReply).toBe(false);
    });
  });

  describe("business_message", () => {
    it("parses a customer message with business_connection_id", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_message: {
          message_id: 99,
          date: 1715000050,
          text: "olá, quero saber sobre o produto",
          business_connection_id: "conn_xyz",
          chat: { id: 777 },
          from: { id: 777, first_name: "Cliente" },
        },
      });
      if (result.kind !== "business_message") {
        throw new Error("expected business_message");
      }
      expect(result.businessConnectionId).toBe("conn_xyz");
      expect(result.senderUserId).toBe(777);
      expect(result.incoming.externalUserId).toBe("777");
      expect(result.incoming.text).toBe("olá, quero saber sobre o produto");
    });

    it("preserves the owner's user id when owner sends a manual reply", () => {
      // Same chat_id (the customer's chat with the owner) but from = owner_user_id.
      // Webhook compares this against the stored connection to skip echoing.
      const result = parseTelegramUpdate({
        update_id: 1,
        business_message: {
          message_id: 100,
          date: 1715000060,
          text: "respondendo manualmente",
          business_connection_id: "conn_xyz",
          chat: { id: 777 },
          from: { id: 12345, first_name: "Owner" },
        },
      });
      if (result.kind !== "business_message") {
        throw new Error("expected business_message");
      }
      expect(result.senderUserId).toBe(12345);
    });

    it("ignores business_message without business_connection_id", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_message: {
          message_id: 1,
          date: 1,
          text: "x",
          chat: { id: 1 },
        },
      });
      expect(result.kind).toBe("ignored");
    });

    it("ignores business_message without text", () => {
      const result = parseTelegramUpdate({
        update_id: 1,
        business_message: {
          message_id: 1,
          date: 1,
          business_connection_id: "conn",
          chat: { id: 1 },
        },
      });
      expect(result.kind).toBe("ignored");
    });
  });
});
