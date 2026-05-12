"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { requireUser, UnauthorizedError } from "@/lib/supabase/server";

const schema = z.object({
  provider: z.enum(["stub", "anthropic", "openai", "zai"]),
  model: z.string().max(100).optional().nullable(),
  apiKey: z.string().max(500).optional().nullable(),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(1).max(8192),
  systemExtras: z.string().max(4000).optional().nullable(),
  zaiPlan: z.enum(["paas", "coding"]).default("paas"),
});

export type UpdateLlmState = { error?: string; ok?: boolean };

export async function updateLlmConfig(
  _prev: UpdateLlmState,
  formData: FormData,
): Promise<UpdateLlmState> {
  const parsed = schema.safeParse({
    provider: formData.get("provider"),
    model: (formData.get("model") as string) || null,
    apiKey: (formData.get("apiKey") as string) || null,
    temperature: formData.get("temperature"),
    maxTokens: formData.get("maxTokens"),
    systemExtras: (formData.get("systemExtras") as string) || null,
    zaiPlan: (formData.get("zaiPlan") as string) || "paas",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { provider, model, apiKey, temperature, maxTokens, systemExtras, zaiPlan } = parsed.data;

  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "Sessão expirada" };
    throw err;
  }
  const { error } = await supabase.rpc("set_llm_config", {
    p_provider: provider,
    p_model: model,
    p_api_key: apiKey,
    p_temperature: temperature,
    p_max_tokens: maxTokens,
    p_system_extras: systemExtras,
    p_zai_plan: zaiPlan,
  });

  if (error) {
    logger.error({ error }, "set_llm_config rpc failed");
    return { error: "Falha ao salvar" };
  }

  revalidatePath("/llm");
  return { ok: true };
}
