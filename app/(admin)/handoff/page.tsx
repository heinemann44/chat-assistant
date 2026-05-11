import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ActiveHandoffs } from "./active-handoffs";
import { HandoffForm } from "./handoff-form";

export const dynamic = "force-dynamic";

export default async function HandoffPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: configRow }, { data: active }] = await Promise.all([
    supabase
      .from("handoff_config")
      .select("notify_channel, notify_target, auto_resume_minutes, trigger_keywords")
      .single(),
    supabase
      .from("conversations")
      .select("id, external_user_id, external_user_name, handoff_until, updated_at")
      .eq("state", "handoff_active")
      .order("updated_at", { ascending: false }),
  ]);

  const initial = {
    notifyChannel: ((configRow?.notify_channel ?? "telegram") as "telegram" | "webhook" | "email") === "email"
      ? "telegram" // collapse the unsupported option for the UI
      : ((configRow?.notify_channel ?? "telegram") as "telegram" | "webhook"),
    notifyTarget: configRow?.notify_target ?? "",
    autoResumeMinutes: Number(configRow?.auto_resume_minutes ?? 30),
    triggerKeywords: (configRow?.trigger_keywords ?? []).join(", "),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Handoff</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Como o bot transfere a conversa pra um humano quando o cliente pede.
          O bot fica em silêncio na conversa até o auto-resume ou até você
          resolver manualmente abaixo.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-sm font-medium">Configuração</h2>
        <HandoffForm initial={initial} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Handoffs ativos</h2>
        <ActiveHandoffs handoffs={active ?? []} />
      </section>
    </div>
  );
}
