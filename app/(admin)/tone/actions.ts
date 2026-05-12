"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { requireUser, UnauthorizedError } from "@/lib/supabase/server";

const schema = z
  .object({
    preset: z.enum(["formal", "casual", "descontraido", "custom"]),
    customInstructions: z
      .string()
      .max(2000, "Máximo 2000 caracteres")
      .optional()
      .nullable(),
  })
  .refine(
    (d) =>
      d.preset !== "custom" ||
      (d.customInstructions && d.customInstructions.trim().length > 0),
    {
      message: "Instruções obrigatórias quando o preset é Custom",
      path: ["customInstructions"],
    },
  );

export type UpdateToneState = { error?: string; ok?: boolean };

export async function updateTone(
  _prev: UpdateToneState,
  formData: FormData,
): Promise<UpdateToneState> {
  const parsed = schema.safeParse({
    preset: formData.get("preset"),
    customInstructions: (formData.get("customInstructions") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let supabase;
  try {
    ({ supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: "Sessão expirada" };
    throw err;
  }

  // RLS on admin_users limits this to the caller's own row.
  const { data: link } = await supabase
    .from("admin_users")
    .select("tenant_id")
    .single();
  if (!link) {
    return { error: "Tenant não encontrado para o usuário" };
  }

  const { error } = await supabase
    .from("tone_config")
    .update({
      preset: parsed.data.preset,
      custom_instructions:
        parsed.data.preset === "custom" ? parsed.data.customInstructions : null,
    })
    .eq("tenant_id", link.tenant_id);

  if (error) {
    logger.error({ error }, "tone_config update failed");
    return { error: "Falha ao salvar" };
  }

  revalidatePath("/tone");
  return { ok: true };
}
