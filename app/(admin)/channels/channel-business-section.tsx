"use client";

import { CircleAlert, CircleDashed, CircleCheck, RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";

import {
  reregisterTelegramWebhook,
  type ReregisterWebhookState,
} from "./actions";

export type BusinessConnection = {
  id: string;
  business_connection_id: string;
  owner_username: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  can_reply: boolean;
  can_read: boolean;
  is_enabled: boolean;
  connected_at: string;
  disconnected_at: string | null;
};

const initialState: ReregisterWebhookState = {};

export function ChannelBusinessSection({
  channelId,
  botUsername,
  connections,
}: {
  channelId: string;
  botUsername?: string;
  connections: BusinessConnection[];
}) {
  const [state, formAction, pending] = useActionState(
    reregisterTelegramWebhook,
    initialState,
  );
  const [helpOpen, setHelpOpen] = useState(connections.length === 0);
  const showFeedback = state.id === channelId;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          Modo Business
        </p>
        <form action={formAction}>
          <input type="hidden" name="id" value={channelId} />
          <button
            type="submit"
            disabled={pending}
            title="Re-registra o webhook do bot incluindo os updates business_*"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${pending ? "animate-spin" : ""}`} />
            {pending ? "Atualizando..." : "Atualizar webhook"}
          </button>
        </form>
      </div>

      {showFeedback && state.error ? (
        <p className="mt-2 rounded-md bg-danger-soft px-2.5 py-1.5 text-xs text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {showFeedback && state.ok ? (
        <p className="mt-2 text-xs text-success">Webhook atualizado.</p>
      ) : null}

      {connections.length === 0 ? (
        <EmptyState botUsername={botUsername} open={helpOpen} onToggle={() => setHelpOpen((o) => !o)} />
      ) : (
        <ul className="mt-3 space-y-2">
          {connections.map((c) => (
            <ConnectionRow key={c.id} connection={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConnectionRow({ connection }: { connection: BusinessConnection }) {
  const displayName =
    connection.owner_username
      ? `@${connection.owner_username}`
      : [connection.owner_first_name, connection.owner_last_name].filter(Boolean).join(" ") ||
        "número conectado";

  const disabled = !connection.is_enabled;
  const noReply = connection.is_enabled && !connection.can_reply;

  return (
    <li className="space-y-1 rounded-md bg-surface-3/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {disabled ? (
          <CircleDashed className="h-3.5 w-3.5 text-fg-subtle" />
        ) : noReply ? (
          <CircleAlert className="h-3.5 w-3.5 text-warning" />
        ) : (
          <CircleCheck className="h-3.5 w-3.5 text-success" />
        )}
        <span className="font-medium">{displayName}</span>
        {disabled ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-fg-muted">
            desativado pelo dono
          </span>
        ) : noReply ? (
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-warning">
            sem permissão de resposta
          </span>
        ) : (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-success">
            pode responder
          </span>
        )}
      </div>
      <p className="text-xs text-fg-muted">
        conectado em{" "}
        {new Date(connection.connected_at).toLocaleString("pt-BR")}
        {disabled && connection.disconnected_at ? (
          <>
            {" · "}desconectado em{" "}
            {new Date(connection.disconnected_at).toLocaleString("pt-BR")}
          </>
        ) : null}
      </p>
      {noReply ? (
        <p className="text-xs text-fg-muted">
          Peça pro dono habilitar &quot;Responder mensagens&quot; em Configurações
          → Telegram Business → Chatbots.
        </p>
      ) : null}
    </li>
  );
}

function EmptyState({
  botUsername,
  open,
  onToggle,
}: {
  botUsername?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <CircleDashed className="h-3.5 w-3.5 text-fg-subtle" />
        Sem conexão ativa
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-xs text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {open ? "Ocultar instruções" : "Como conectar um número pessoal"}
      </button>
      {open ? (
        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-fg-muted">
          <li>
            No <span className="font-mono">@BotFather</span>: <span className="font-mono">/mybots</span>{" "}
            → escolha o bot → Bot Settings → Business Mode → <em>Turn on</em>.
          </li>
          <li>
            O dono do número pessoal abre o app Telegram → Configurações →{" "}
            <span className="font-medium">Telegram Business</span> → Chatbots → digita{" "}
            {botUsername ? (
              <span className="font-mono">@{botUsername}</span>
            ) : (
              <span>o @ do bot</span>
            )}{" "}
            e habilita &quot;Responder mensagens&quot;.
          </li>
          <li>
            Volte aqui e clique em <span className="font-medium">Atualizar webhook</span>{" "}
            (necessário 1x se o canal foi criado antes da fase 11) — sem isso o Telegram
            não envia os updates business_*.
          </li>
        </ol>
      ) : null}
    </div>
  );
}
