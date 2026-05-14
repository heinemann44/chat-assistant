"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  deleteWebhook,
  getMe,
  setWebhook,
  TelegramApiError,
} from "@/lib/channels/telegram/api";
import { getDecryptedSecret } from "@/lib/db/vault";
import { logger } from "@/lib/logger";
import { requireUser, UnauthorizedError } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(80),
  botToken: z
    .string()
    .min(20, "Token muito curto")
    .regex(/^\d+:[A-Za-z0-9_-]{20,}$/i, "Formato de token Telegram inválido"),
});

export type CreateChannelState = { error?: string; ok?: boolean };

export async function createTelegramChannel(
  _prev: CreateChannelState,
  formData: FormData,
): Promise<CreateChannelState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    botToken: formData.get("botToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { name, botToken } = parsed.data;

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return { error: "APP_URL não configurado no servidor" };
  }

  let botInfo;
  try {
    botInfo = await getMe(botToken);
  } catch (err) {
    logger.warn({ err }, "telegram getMe failed");
    return { error: "Token rejeitado pelo Telegram (getMe falhou)" };
  }

  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "Sessão expirada" };
    throw err;
  }
  const { data: rpcRows, error: rpcError } = await supabase
    .rpc("create_telegram_channel", {
      p_name: name,
      p_bot_token: botToken,
    });
  if (rpcError || !rpcRows || rpcRows.length === 0) {
    logger.error({ rpcError }, "create_telegram_channel rpc failed");
    return { error: "Falha ao criar canal no banco" };
  }
  const { id, webhook_secret } = rpcRows[0] as { id: string; webhook_secret: string };

  await supabase
    .from("channel_instances")
    .update({
      config: {
        telegram: {
          bot_id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.firstName,
        },
      },
    })
    .eq("id", id);

  const webhookUrl = `${appUrl.replace(/\/+$/, "")}/api/channels/telegram/webhook/${id}`;
  try {
    await setWebhook(botToken, webhookUrl, webhook_secret);
  } catch (err) {
    logger.error({ err, webhookUrl }, "telegram setWebhook failed");
    // Don't roll back — the admin can retry registration via the page.
    return {
      error:
        err instanceof TelegramApiError
          ? `Canal criado mas setWebhook falhou: ${err.description}`
          : "Canal criado mas setWebhook falhou",
    };
  }

  revalidatePath("/channels");
  return { ok: true };
}

export async function deleteTelegramChannel(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase } = await requireUser();
  // RLS gate: ensures the channel belongs to the caller's tenant.
  const { data: channel } = await supabase
    .from("channel_instances")
    .select("id, type, bot_token_secret_id")
    .eq("id", id)
    .single();
  if (!channel) return;

  if (channel.type === "telegram" && channel.bot_token_secret_id) {
    try {
      const token = await getDecryptedSecret(channel.bot_token_secret_id);
      if (token) await deleteWebhook(token);
    } catch (err) {
      logger.warn({ err }, "telegram deleteWebhook failed (ignored)");
    }
  }

  const { error: rpcError } = await supabase.rpc("delete_channel_instance", {
    p_id: id,
  });
  if (rpcError) {
    logger.error({ rpcError }, "delete_channel_instance rpc failed");
  }

  revalidatePath("/channels");
}

export async function toggleChannelEnabled(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;

  // RLS scopes this update to the caller's tenant.
  const { supabase } = await requireUser();
  await supabase.from("channel_instances").update({ enabled }).eq("id", id);

  revalidatePath("/channels");
}

export type ReregisterWebhookState = { error?: string; ok?: boolean; id?: string };

export async function reregisterTelegramWebhook(
  _prev: ReregisterWebhookState,
  formData: FormData,
): Promise<ReregisterWebhookState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "id ausente" };

  const appUrl = process.env.APP_URL;
  if (!appUrl) return { error: "APP_URL não configurado", id };

  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "Sessão expirada", id };
    throw err;
  }

  // RLS gate: only returns rows belonging to the caller's tenant.
  const { data: channel } = await supabase
    .from("channel_instances")
    .select("id, type, bot_token_secret_id, webhook_secret")
    .eq("id", id)
    .single();
  if (!channel || channel.type !== "telegram" || !channel.bot_token_secret_id) {
    return { error: "Canal Telegram não encontrado", id };
  }

  const token = await getDecryptedSecret(channel.bot_token_secret_id);
  if (!token) return { error: "Token do bot não disponível", id };

  const webhookUrl = `${appUrl.replace(/\/+$/, "")}/api/channels/telegram/webhook/${id}`;
  try {
    await setWebhook(token, webhookUrl, channel.webhook_secret);
  } catch (err) {
    logger.error({ err, webhookUrl }, "telegram setWebhook re-register failed");
    return {
      error:
        err instanceof TelegramApiError
          ? `setWebhook falhou: ${err.description}`
          : "setWebhook falhou",
      id,
    };
  }

  revalidatePath("/channels");
  return { ok: true, id };
}
