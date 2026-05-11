"use client";

import { useActionState, useEffect, useRef } from "react";

import { createFaq, updateFaq, type FaqFormState } from "./actions";

const initialState: FaqFormState = {};

type Initial = {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  enabled: boolean;
};

export function FaqForm({ mode, initial }: { mode: "create" | "edit"; initial?: Initial }) {
  const action = mode === "create" ? createFaq : updateFaq;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (mode === "create" && state.ok) {
      formRef.current?.reset();
    }
  }, [mode, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="question" className="text-sm font-medium">
          Pergunta
        </label>
        <input
          id="question"
          name="question"
          required
          defaultValue={initial?.question ?? ""}
          maxLength={500}
          placeholder="Qual o horário de atendimento?"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="answer" className="text-sm font-medium">
          Resposta
        </label>
        <textarea
          id="answer"
          name="answer"
          required
          rows={4}
          maxLength={4000}
          defaultValue={initial?.answer ?? ""}
          placeholder="Atendemos de segunda a sexta, das 9h às 18h."
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-fg-muted">
          O LLM ajusta a frase ao tom configurado em <code className="rounded bg-surface-3 px-1 font-mono text-[11px]">/tone</code>.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="keywords" className="text-sm font-medium">
          Palavras-chave <span className="text-xs font-normal text-fg-muted">(opcional)</span>
        </label>
        <input
          id="keywords"
          name="keywords"
          defaultValue={initial?.keywords ?? ""}
          placeholder="horário, expediente, atendimento"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-fg-muted">
          Separadas por vírgula. Reservadas pra um matcher mais rápido em fases futuras.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial?.enabled ?? true}
          className="h-4 w-4 rounded border-border-strong text-accent focus:ring-ring"
        />
        Ativada
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Salvando..." : mode === "create" ? "Adicionar" : "Salvar"}
        </button>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">{state.error}</p>
        ) : null}
        {mode === "create" && state.ok ? (
          <p className="text-sm text-success">FAQ adicionada.</p>
        ) : null}
      </div>
    </form>
  );
}
