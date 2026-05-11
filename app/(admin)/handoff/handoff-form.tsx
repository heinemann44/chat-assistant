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
                    ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
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
                <div className="text-sm font-medium">{CHANNEL_HINTS[c].label}</div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {CHANNEL_HINTS[c].help}
                </p>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          E-mail não está disponível enquanto o projeto roda no plano free do Supabase.
        </p>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="notifyTarget" className="text-sm font-medium">
          {channel === "telegram" ? "Chat ID do dono" : "URL do webhook"}
        </label>
        <input
          id="notifyTarget"
          name="notifyTarget"
          required
          defaultValue={initial.notifyTarget}
          placeholder={hint.placeholder}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
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
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Depois desse tempo o bot volta a responder na mesma conversa.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="triggerKeywords" className="text-sm font-medium">
            Palavras-gatilho
          </label>
          <input
            id="triggerKeywords"
            name="triggerKeywords"
            defaultValue={initial.triggerKeywords}
            placeholder="atendente, humano, pessoa, falar com"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Separadas por vírgula. Match por substring (case-insensitive).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-green-700 dark:text-green-400">Salvo.</p>
        ) : null}
      </div>
    </form>
  );
}
