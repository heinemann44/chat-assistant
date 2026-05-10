// Thin wrapper around the Telegram Bot API. We use fetch directly instead of
// grammy because we only need sendMessage + setWebhook + getMe on the webhook
// path; grammy's strengths (composers, sessions, long polling) don't apply
// when running serverless.

const API_BASE = "https://api.telegram.org";

export class TelegramApiError extends Error {
  constructor(public readonly method: string, public readonly description: string, public readonly errorCode?: number) {
    super(`Telegram ${method} failed: ${description}`);
  }
}

type TelegramResult<T> = { ok: true; result: T } | { ok: false; description: string; error_code?: number };

async function call<T>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as TelegramResult<T>;
  if (!json.ok) {
    throw new TelegramApiError(method, json.description, json.error_code);
  }
  return json.result;
}

export type BotInfo = {
  id: number;
  username: string;
  firstName: string;
};

export async function getMe(token: string): Promise<BotInfo> {
  const r = await call<{ id: number; username: string; first_name: string }>(token, "getMe", {});
  return { id: r.id, username: r.username, firstName: r.first_name };
}

export async function sendMessage(token: string, chatId: string | number, text: string): Promise<void> {
  await call(token, "sendMessage", { chat_id: chatId, text });
}

export async function setWebhook(token: string, url: string, secretToken: string): Promise<void> {
  await call(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<void> {
  await call(token, "deleteWebhook", { drop_pending_updates: true });
}
