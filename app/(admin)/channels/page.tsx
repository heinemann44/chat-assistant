import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ChannelForm } from "./channel-form";
import { ChannelList } from "./channel-list";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: channels }, { data: businessConnections }] = await Promise.all([
    supabase
      .from("channel_instances")
      .select("id, type, name, enabled, created_at, config")
      .order("created_at", { ascending: false }),
    supabase
      .from("telegram_business_connections")
      .select(
        "id, channel_instance_id, business_connection_id, owner_username, owner_first_name, owner_last_name, can_reply, can_read, is_enabled, connected_at, disconnected_at",
      )
      .order("connected_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          Canais
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Conexões de mensagem
        </h1>
        <p className="text-sm text-fg-muted">
          Conecte bots do Telegram. WhatsApp, Slack e Discord virão em outras fases.
        </p>
      </header>

      <ChannelForm />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg-muted">Conectados</h2>
        <ChannelList
          channels={channels ?? []}
          businessConnections={businessConnections ?? []}
        />
      </section>
    </div>
  );
}
