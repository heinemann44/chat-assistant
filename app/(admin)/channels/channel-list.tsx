import { Power, Trash2 } from "lucide-react";

import {
  deleteTelegramChannel,
  toggleChannelEnabled,
} from "./actions";
import {
  ChannelBusinessSection,
  type BusinessConnection,
} from "./channel-business-section";

type TelegramConfig = {
  bot_id?: number;
  username?: string;
  first_name?: string;
};

type ChannelRow = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  created_at: string;
  config: { telegram?: TelegramConfig } | null;
};

type BusinessConnectionRow = BusinessConnection & {
  channel_instance_id: string;
};

export function ChannelList({
  channels,
  businessConnections,
}: {
  channels: ChannelRow[];
  businessConnections: BusinessConnectionRow[];
}) {
  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-fg-muted">
        Nenhum canal conectado ainda.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {channels.map((channel) => {
        const username = channel.config?.telegram?.username;
        const connections = businessConnections.filter(
          (c) => c.channel_instance_id === channel.id,
        );
        return (
          <li
            key={channel.id}
            className="rounded-xl border border-border bg-surface-2 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{channel.name}</span>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                    {channel.type}
                  </span>
                  {!channel.enabled ? (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">
                      desativado
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-fg-muted">
                  {username ? `@${username} · ` : ""}
                  criado em {new Date(channel.created_at).toLocaleString("pt-BR")}
                </div>
                <div className="truncate font-mono text-xs text-fg-subtle">{channel.id}</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <form action={toggleChannelEnabled}>
                  <input type="hidden" name="id" value={channel.id} />
                  <input type="hidden" name="enabled" value={(!channel.enabled).toString()} />
                  <button
                    type="submit"
                    title={channel.enabled ? "Desativar" : "Ativar"}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {channel.enabled ? "Desativar" : "Ativar"}
                  </button>
                </form>
                <form action={deleteTelegramChannel}>
                  <input type="hidden" name="id" value={channel.id} />
                  <button
                    type="submit"
                    title="Excluir"
                    className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </form>
              </div>
            </div>

            {channel.type === "telegram" ? (
              <ChannelBusinessSection
                channelId={channel.id}
                botUsername={username}
                connections={connections}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
