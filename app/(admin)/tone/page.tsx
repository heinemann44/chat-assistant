import type { TonePreset } from "@/lib/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ToneForm } from "./tone-form";

export const dynamic = "force-dynamic";

export default async function TonePage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("tone_config")
    .select("preset, custom_instructions")
    .single();

  const initialPreset = (data?.preset as TonePreset | undefined) ?? "casual";
  const initialCustom = data?.custom_instructions ?? "";

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          Tom
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Como o bot conversa
        </h1>
        <p className="text-sm text-fg-muted">
          Define a personalidade das respostas. Aplicado em todos os canais deste tenant.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
        <ToneForm initialPreset={initialPreset} initialCustom={initialCustom} />
      </div>
    </div>
  );
}
