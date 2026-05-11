"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const baseSchema = z.object({
  question: z.string().trim().min(2, "Pergunta obrigatória").max(500),
  answer: z.string().trim().min(2, "Resposta obrigatória").max(4000),
  keywords: z.string().max(500).optional().nullable(),
  enabled: z
    .union([z.literal("on"), z.literal("off"), z.literal("true"), z.literal("false")])
    .optional()
    .nullable(),
});

function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function parseEnabled(raw: string | null | undefined): boolean {
  // Checkbox sends "on" when checked, nothing when not. We pre-set a default
  // in hidden field so we always get something.
  return raw === "on" || raw === "true";
}

export type FaqFormState = { error?: string; ok?: boolean };

async function getTenantId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("admin_users").select("tenant_id").single();
  return { supabase, tenantId: data?.tenant_id ?? null };
}

export async function createFaq(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  const parsed = baseSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    keywords: formData.get("keywords"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { supabase, tenantId } = await getTenantId();
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("faqs").insert({
    tenant_id: tenantId,
    question: parsed.data.question,
    answer: parsed.data.answer,
    keywords: parseKeywords(parsed.data.keywords),
    enabled: parseEnabled(parsed.data.enabled) || true,
  });
  if (error) {
    logger.error({ error }, "createFaq insert failed");
    return { error: "Falha ao salvar" };
  }

  revalidatePath("/faqs");
  return { ok: true };
}

export async function updateFaq(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "id ausente" };

  const parsed = baseSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    keywords: formData.get("keywords"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("faqs")
    .update({
      question: parsed.data.question,
      answer: parsed.data.answer,
      keywords: parseKeywords(parsed.data.keywords),
      enabled: parseEnabled(parsed.data.enabled),
    })
    .eq("id", id);
  if (error) {
    logger.error({ error }, "updateFaq failed");
    return { error: "Falha ao salvar" };
  }

  revalidatePath("/faqs");
  redirect("/faqs");
}

export async function deleteFaq(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("faqs").delete().eq("id", id);
  revalidatePath("/faqs");
}

export async function toggleFaqEnabled(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("faqs").update({ enabled }).eq("id", id);
  revalidatePath("/faqs");
}
