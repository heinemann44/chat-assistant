import { z } from "zod";

import type { IncomingMessage } from "@/lib/core/types";

// Minimal subset of the Telegram Update schema — only message text from a
// private/group chat. Bot commands, edits, media, callbacks ignored for MVP.
const updateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      date: z.number(),
      text: z.string().optional(),
      chat: z.object({
        id: z.union([z.number(), z.string()]),
      }),
      from: z
        .object({
          id: z.number(),
          username: z.string().optional(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ParsedUpdate =
  | { kind: "message"; incoming: Omit<IncomingMessage, "channel" | "channelInstanceId"> }
  | { kind: "ignored"; reason: string };

// Telegram allows up to ~4096 chars per message. We cap before the LLM to
// contain cost-burn and prompt-injection surface.
const MAX_USER_TEXT_CHARS = 2000;

export function parseTelegramUpdate(raw: unknown): ParsedUpdate {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: "ignored", reason: "invalid update payload" };
  }

  const msg = parsed.data.message;
  if (!msg) return { kind: "ignored", reason: "non-message update" };
  if (!msg.text || msg.text.trim().length === 0) {
    return { kind: "ignored", reason: "message without text" };
  }

  const externalUserId = String(msg.chat.id);
  const externalUserName = msg.from
    ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") ||
      msg.from.username ||
      null
    : null;

  const text =
    msg.text.length > MAX_USER_TEXT_CHARS
      ? msg.text.slice(0, MAX_USER_TEXT_CHARS)
      : msg.text;

  return {
    kind: "message",
    incoming: {
      externalUserId,
      externalUserName: externalUserName ?? undefined,
      text,
      receivedAt: new Date(msg.date * 1000),
    },
  };
}
