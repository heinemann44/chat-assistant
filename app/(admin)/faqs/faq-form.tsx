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

      <div className="space-y-1">
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
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <div className="space-y-1">
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
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          O LLM ajusta a frase ao tom configurado em <code>/tone</code>.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="keywords" className="text-sm font-medium">
          Palavras-chave (opcional)
        </label>
        <input
          id="keywords"
          name="keywords"
          defaultValue={initial?.keywords ?? ""}
          placeholder="horário, expediente, atendimento"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Separadas por vírgula. Reservadas pra um matcher mais rápido em fases futuras.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial?.enabled ?? true}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Ativada
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Salvando..." : mode === "create" ? "Adicionar" : "Salvar"}
        </button>
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        {mode === "create" && state.ok ? (
          <p className="text-sm text-green-700 dark:text-green-400">FAQ adicionada.</p>
        ) : null}
      </div>
    </form>
  );
}
