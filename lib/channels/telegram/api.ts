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
  // The URL embeds the bot token; native fetch errors (DNS, TLS, timeout)
  // often include the full URL in the message/stack. We catch and rethrow
  // with a stripped description so logs never carry the secret.
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new TelegramApiError(method, "network error");
  }
  let json: TelegramResult<T>;
  try {
    json = (await res.json()) as TelegramResult<T>;
  } catch {
    throw new TelegramApiError(method, `invalid response (status ${res.status})`);
  }
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

export type SendMessageOptions = {
  businessConnectionId?: string;
};

export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  opts: SendMessageOptions = {},
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (opts.businessConnectionId) {
    body.business_connection_id = opts.businessConnectionId;
  }
  await call(token, "sendMessage", body);
}

export async function setWebhook(token: string, url: string, secretToken: string): Promise<void> {
  await call(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "business_connection", "business_message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<void> {
  await call(token, "deleteWebhook", { drop_pending_updates: true });
}
