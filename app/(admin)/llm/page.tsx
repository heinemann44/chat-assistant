import { createSupabaseServerClient } from "@/lib/supabase/server";

import { LlmForm } from "./llm-form";

export const dynamic = "force-dynamic";

export default async function LlmPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("llm_config")
    .select("provider, model, api_key_secret_id, temperature, max_tokens, system_extras, zai_plan")
    .single();

  const initial = {
    provider: (data?.provider ?? "stub") as "stub" | "anthropic" | "openai" | "zai",
    model: data?.model ?? "",
    hasApiKey: !!data?.api_key_secret_id,
    temperature: Number(data?.temperature ?? 0.7),
    maxTokens: Number(data?.max_tokens ?? 1024),
    systemExtras: data?.system_extras ?? "",
    zaiPlan: (data?.zai_plan ?? "paas") as "paas" | "coding",
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          LLM
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Provider de IA
        </h1>
        <p className="text-sm text-fg-muted">
          Escolha o provider, modelo e parâmetros. A API key é guardada no Supabase Vault
          — só sai do banco em código privilegiado.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
        <LlmForm initial={initial} />
      </div>
    </div>
  );
}
