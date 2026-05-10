import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ChannelForm } from "./channel-form";
import { ChannelList } from "./channel-list";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: channels } = await supabase
    .from("channel_instances")
    .select("id, type, name, enabled, created_at, config")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Canais</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Conecte bots do Telegram (WhatsApp, Slack e Discord virão em outras fases).
        </p>
      </div>

      <ChannelForm />

      <ChannelList channels={channels ?? []} />
    </div>
  );
}
