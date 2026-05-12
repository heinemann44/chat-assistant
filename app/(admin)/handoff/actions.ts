"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { requireUser, UnauthorizedError } from "@/lib/supabase/server";

const configSchema = z
  .object({
    notifyChannel: z.enum(["telegram", "webhook"]),
    notifyTarget: z.string().trim().min(1, "Destino obrigatório").max(500),
    autoResumeMinutes: z.coerce.number().int().min(1).max(1440),
    triggerKeywords: z.string().max(1000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.notifyChannel === "telegram") {
      if (!/^-?\d+$/.test(val.notifyTarget)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["notifyTarget"],
          message: "Para Telegram, informe o chat_id numérico",
        });
      }
      return;
    }
    // webhook: must be a parseable https URL
    let url: URL;
    try {
      url = new URL(val.notifyTarget);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notifyTarget"],
        message: "URL inválida",
      });
      return;
    }
    if (url.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notifyTarget"],
        message: "URL deve usar https://",
      });
    }
  });

export type UpdateHandoffState = { error?: string; ok?: boolean };

export async function updateHandoffConfig(
  _prev: UpdateHandoffState,
  formData: FormData,
): Promise<UpdateHandoffState> {
  const parsed = configSchema.safeParse({
    notifyChannel: formData.get("notifyChannel"),
    notifyTarget: formData.get("notifyTarget"),
    autoResumeMinutes: formData.get("autoResumeMinutes"),
    triggerKeywords: formData.get("triggerKeywords"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const keywords = (parsed.data.triggerKeywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "Sessão expirada" };
    throw err;
  }
  const { data: link } = await supabase
    .from("admin_users")
    .select("tenant_id")
    .single();
  if (!link) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("handoff_config")
    .update({
      notify_channel: parsed.data.notifyChannel,
      notify_target: parsed.data.notifyTarget,
      auto_resume_minutes: parsed.data.autoResumeMinutes,
      trigger_keywords: keywords,
    })
    .eq("tenant_id", link.tenant_id);
  if (error) {
    logger.error({ error }, "updateHandoffConfig failed");
    return { error: "Falha ao salvar" };
  }

  revalidatePath("/handoff");
  return { ok: true };
}

export async function resolveHandoff(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return;

  const { supabase, user } = await requireUser();

  await supabase
    .from("conversations")
    .update({ state: "active", handoff_until: null })
    .eq("id", conversationId);

  await supabase
    .from("handoff_events")
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("conversation_id", conversationId)
    .is("resolved_at", null);

  revalidatePath("/handoff");
}
