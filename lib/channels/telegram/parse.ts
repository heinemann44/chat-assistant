import { z } from "zod";

import type { IncomingMessage } from "@/lib/core/types";

const userSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const messageSchema = z.object({
  message_id: z.number(),
  date: z.number(),
  text: z.string().optional(),
  business_connection_id: z.string().optional(),
  chat: z.object({
    id: z.union([z.number(), z.string()]),
  }),
  from: userSchema.optional(),
});

// `rights` replaced top-level `can_reply` in Bot API 9.0 (Aug 2025), but we accept
// both shapes so older test fixtures and intermediate payloads still parse.
const businessConnectionSchema = z.object({
  id: z.string(),
  user: userSchema,
  user_chat_id: z.number().optional(),
  date: z.number(),
  can_reply: z.boolean().optional(),
  is_enabled: z.boolean(),
  rights: z
    .object({
      can_reply: z.boolean().optional(),
      can_read_messages: z.boolean().optional(),
    })
    .optional(),
});

const updateSchema = z.object({
  update_id: z.number(),
  message: messageSchema.optional(),
  business_message: messageSchema.optional(),
  business_connection: businessConnectionSchema.optional(),
});

export type ParsedBusinessConnection = {
  businessConnectionId: string;
  ownerUserId: number;
  ownerUsername: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  userChatId: number | null;
  canReply: boolean;
  canRead: boolean;
  isEnabled: boolean;
  connectedAt: Date;
};

type ParsedIncoming = Omit<IncomingMessage, "channel" | "channelInstanceId">;

export type ParsedUpdate =
  | { kind: "message"; incoming: ParsedIncoming }
  | {
      kind: "business_message";
      incoming: ParsedIncoming;
      businessConnectionId: string;
      senderUserId: number | null;
    }
  | { kind: "business_connection"; connection: ParsedBusinessConnection }
  | { kind: "ignored"; reason: string };

// Telegram allows up to ~4096 chars per message. We cap before the LLM to
// contain cost-burn and prompt-injection surface.
const MAX_USER_TEXT_CHARS = 2000;

export function parseTelegramUpdate(raw: unknown): ParsedUpdate {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: "ignored", reason: "invalid update payload" };
  }

  const data = parsed.data;

  if (data.business_connection) {
    const bc = data.business_connection;
    const canReply = bc.rights?.can_reply ?? bc.can_reply ?? false;
    const canRead = bc.rights?.can_read_messages ?? false;
    return {
      kind: "business_connection",
      connection: {
        businessConnectionId: bc.id,
        ownerUserId: bc.user.id,
        ownerUsername: bc.user.username ?? null,
        ownerFirstName: bc.user.first_name ?? null,
        ownerLastName: bc.user.last_name ?? null,
        userChatId: bc.user_chat_id ?? null,
        canReply,
        canRead,
        isEnabled: bc.is_enabled,
        connectedAt: new Date(bc.date * 1000),
      },
    };
  }

  if (data.business_message) {
    const msg = data.business_message;
    if (!msg.business_connection_id) {
      return { kind: "ignored", reason: "business_message without connection id" };
    }
    if (!msg.text || msg.text.trim().length === 0) {
      return { kind: "ignored", reason: "business_message without text" };
    }
    return {
      kind: "business_message",
      incoming: buildIncoming(msg),
      businessConnectionId: msg.business_connection_id,
      senderUserId: msg.from?.id ?? null,
    };
  }

  if (!data.message) return { kind: "ignored", reason: "non-message update" };
  if (!data.message.text || data.message.text.trim().length === 0) {
    return { kind: "ignored", reason: "message without text" };
  }
  return { kind: "message", incoming: buildIncoming(data.message) };
}

function buildIncoming(msg: z.infer<typeof messageSchema>): ParsedIncoming {
  const externalUserId = String(msg.chat.id);
  const externalUserName = msg.from
    ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") ||
      msg.from.username ||
      null
    : null;
  const rawText = msg.text ?? "";
  const text =
    rawText.length > MAX_USER_TEXT_CHARS
      ? rawText.slice(0, MAX_USER_TEXT_CHARS)
      : rawText;
  return {
    externalUserId,
    externalUserName: externalUserName ?? undefined,
    text,
    receivedAt: new Date(msg.date * 1000),
  };
}
