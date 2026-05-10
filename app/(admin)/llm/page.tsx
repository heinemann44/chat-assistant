import { createSupabaseServerClient } from "@/lib/supabase/server";

import { LlmForm } from "./llm-form";

export const dynamic = "force-dynamic";

export default async function LlmPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("llm_config")
    .select("provider, model, api_key_secret_id, temperature, max_tokens, system_extras")
    .single();

  const initial = {
    provider: (data?.provider ?? "stub") as "stub" | "anthropic" | "openai",
    model: data?.model ?? "",
    hasApiKey: !!data?.api_key_secret_id,
    temperature: Number(data?.temperature ?? 0.7),
    maxTokens: Number(data?.max_tokens ?? 1024),
    systemExtras: data?.system_extras ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LLM</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Escolha o provider, modelo e parâmetros. A API key é guardada no
          Supabase Vault — só sai do banco em código privilegiado.
        </p>
      </div>
      <LlmForm initial={initial} />
    </div>
  );
}
