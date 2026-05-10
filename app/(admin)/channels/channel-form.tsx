"use client";

import { useActionState, useEffect, useRef } from "react";

import { createTelegramChannel, type CreateChannelState } from "./actions";

const initialState: CreateChannelState = {};

export function ChannelForm() {
  const [state, formAction, pending] = useActionState(createTelegramChannel, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <h2 className="text-sm font-medium">Conectar novo bot Telegram</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Cole o token gerado pelo @BotFather. Validamos com o Telegram antes de salvar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-medium">
            Nome interno
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Atendimento principal"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="botToken" className="text-xs font-medium">
            Bot token
          </label>
          <input
            id="botToken"
            name="botToken"
            required
            type="password"
            autoComplete="off"
            placeholder="123456789:AAA..."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-700 dark:text-green-400">
          Canal criado e webhook registrado.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending ? "Validando..." : "Conectar"}
      </button>
    </form>
  );
}
