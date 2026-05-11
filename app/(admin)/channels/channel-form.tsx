"use client";

import { Plus } from "lucide-react";
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
      className="space-y-4 rounded-xl border border-border bg-surface-2 p-5"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Conectar novo bot Telegram</h2>
        <p className="text-xs text-fg-muted">
          Cole o token gerado pelo @BotFather. Validamos com o Telegram antes de salvar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-medium">
            Nome interno
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Atendimento principal"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-success">Canal criado e webhook registrado.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" />
        {pending ? "Validando..." : "Conectar"}
      </button>
    </form>
  );
}
