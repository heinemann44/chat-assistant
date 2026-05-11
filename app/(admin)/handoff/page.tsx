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
      ? "telegram"
      : ((configRow?.notify_channel ?? "telegram") as "telegram" | "webhook"),
    notifyTarget: configRow?.notify_target ?? "",
    autoResumeMinutes: Number(configRow?.auto_resume_minutes ?? 30),
    triggerKeywords: (configRow?.trigger_keywords ?? []).join(", "),
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          Handoff
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Transferência pra humano
        </h1>
        <p className="text-sm text-fg-muted">
          Como o bot avisa você quando o cliente pede atendimento. O bot fica em silêncio
          até o auto-resume ou até você resolver manualmente abaixo.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Configuração</h2>
        <HandoffForm initial={initial} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg-muted">Handoffs ativos</h2>
        <ActiveHandoffs handoffs={active ?? []} />
      </section>
    </div>
  );
}
