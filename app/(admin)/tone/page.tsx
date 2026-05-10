import type { TonePreset } from "@/lib/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ToneForm } from "./tone-form";

export const dynamic = "force-dynamic";

export default async function TonePage() {
  const supabase = await createSupabaseServerClient();

  // RLS scopes tone_config to the caller's tenant; .single() returns its one row.
  const { data } = await supabase
    .from("tone_config")
    .select("preset, custom_instructions")
    .single();

  const initialPreset = (data?.preset as TonePreset | undefined) ?? "casual";
  const initialCustom = data?.custom_instructions ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tom</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Define como o bot conversa com seus clientes. Aplicado em todos os
          canais deste tenant.
        </p>
      </div>

      <ToneForm initialPreset={initialPreset} initialCustom={initialCustom} />
    </div>
  );
}
