import {
  deleteTelegramChannel,
  toggleChannelEnabled,
} from "./actions";

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

export function ChannelList({ channels }: { channels: ChannelRow[] }) {
  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        Nenhum canal conectado ainda.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {channels.map((channel) => {
        const username = channel.config?.telegram?.username;
        return (
          <li
            key={channel.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{channel.name}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {channel.type}
                </span>
                {!channel.enabled ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
                    desativado
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {username ? `@${username} · ` : ""}
                criado em {new Date(channel.created_at).toLocaleString("pt-BR")}
              </div>
              <div className="font-mono text-xs text-neutral-400">{channel.id}</div>
            </div>

            <div className="flex items-center gap-2">
              <form action={toggleChannelEnabled}>
                <input type="hidden" name="id" value={channel.id} />
                <input
                  type="hidden"
                  name="enabled"
                  value={(!channel.enabled).toString()}
                />
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {channel.enabled ? "Desativar" : "Ativar"}
                </button>
              </form>
              <form action={deleteTelegramChannel}>
                <input type="hidden" name="id" value={channel.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Excluir
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
