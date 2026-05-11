"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  provider: z.enum(["stub", "anthropic", "openai", "zai"]),
  model: z.string().max(100).optional().nullable(),
  apiKey: z.string().max(500).optional().nullable(),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(1).max(8192),
  systemExtras: z.string().max(4000).optional().nullable(),
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { provider, model, apiKey, temperature, maxTokens, systemExtras } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_llm_config", {
    p_provider: provider,
    p_model: model,
    p_api_key: apiKey,
    p_temperature: temperature,
    p_max_tokens: maxTokens,
    p_system_extras: systemExtras,
  });

  if (error) {
    logger.error({ error }, "set_llm_config rpc failed");
    return { error: error.message };
  }

  revalidatePath("/llm");
  return { ok: true };
}
