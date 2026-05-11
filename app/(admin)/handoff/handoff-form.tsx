"use client";

import { useActionState, useState } from "react";

import { updateHandoffConfig, type UpdateHandoffState } from "./actions";

type Channel = "telegram" | "webhook";

const initialState: UpdateHandoffState = {};

type Props = {
  initial: {
    notifyChannel: Channel;
    notifyTarget: string;
    autoResumeMinutes: number;
    triggerKeywords: string;
  };
};

const CHANNEL_HINTS: Record<Channel, { label: string; placeholder: string; help: string }> = {
  telegram: {
    label: "Telegram",
    placeholder: "123456789",
    help: "Chat ID do dono. Fale com @userinfobot pra descobrir o seu.",
  },
  webhook: {
    label: "Webhook",
    placeholder: "https://hooks.example.com/handoff",
    help: "POST JSON com a mensagem e o contexto da conversa.",
  },
};

export function HandoffForm({ initial }: Props) {
  const [channel, setChannel] = useState<Channel>(initial.notifyChannel);
  const [state, formAction, pending] = useActionState(updateHandoffConfig, initialState);

  const hint = CHANNEL_HINTS[channel];

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Canal de notificação</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["telegram", "webhook"] as Channel[]).map((c) => {
            const selected = channel === c;
            return (
              <label
                key={c}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:bg-surface-3"
                }`}
              >
                <input
                  type="radio"
                  name="notifyChannel"
                  value={c}
                  checked={selected}
                  onChange={() => setChannel(c)}
                  className="sr-only"
                />
                <div className={`text-sm font-medium ${selected ? "text-accent" : ""}`}>
                  {CHANNEL_HINTS[c].label}
                </div>
                <p className="mt-1 text-xs text-fg-muted">{CHANNEL_HINTS[c].help}</p>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-fg-muted">
          E-mail não está disponível enquanto o projeto roda no plano free do Supabase.
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="notifyTarget" className="text-sm font-medium">
          {channel === "telegram" ? "Chat ID do dono" : "URL do webhook"}
        </label>
        <input
          id="notifyTarget"
          name="notifyTarget"
          required
          defaultValue={initial.notifyTarget}
          placeholder={hint.placeholder}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="autoResumeMinutes" className="text-sm font-medium">
            Auto-resume (minutos)
          </label>
          <input
            id="autoResumeMinutes"
            name="autoResumeMinutes"
            type="number"
            min="1"
            max="1440"
            required
            defaultValue={initial.autoResumeMinutes}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-fg-muted">
            Depois desse tempo o bot volta a responder na mesma conversa.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="triggerKeywords" className="text-sm font-medium">
            Palavras-gatilho
          </label>
          <input
            id="triggerKeywords"
            name="triggerKeywords"
            defaultValue={initial.triggerKeywords}
            placeholder="atendente, humano, pessoa, falar com"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-fg-muted">
            Separadas por vírgula. Match por substring (case-insensitive).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-success">Salvo.</p> : null}
      </div>
    </form>
  );
}
