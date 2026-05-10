"use client";

import { useActionState, useState } from "react";

import type { TonePreset } from "@/lib/core/types";

import { updateTone, type UpdateToneState } from "./actions";

const PRESETS: Array<{ value: TonePreset; label: string; description: string }> = [
  {
    value: "formal",
    label: "Formal",
    description:
      "Respeitoso e profissional. Trata por “você” com cortesia corporativa. Sem gírias nem emojis.",
  },
  {
    value: "casual",
    label: "Casual",
    description:
      "Amigável e claro, sem ser informal demais. Linguagem acessível, emojis só se realmente couberem.",
  },
  {
    value: "descontraido",
    label: "Descontraído",
    description:
      "Leve, com bom humor moderado. Gírias suaves e emojis ocasionais quando ajudam.",
  },
  {
    value: "custom",
    label: "Custom",
    description:
      "Instruções livres definidas por você no campo abaixo (substitui os presets).",
  },
];

const initialState: UpdateToneState = {};

type Props = {
  initialPreset: TonePreset;
  initialCustom: string;
};

export function ToneForm({ initialPreset, initialCustom }: Props) {
  const [preset, setPreset] = useState<TonePreset>(initialPreset);
  const [state, formAction, pending] = useActionState(updateTone, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tom da resposta</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PRESETS.map((p) => {
            const selected = preset === p.value;
            return (
              <label
                key={p.value}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  selected
                    ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                }`}
              >
                <input
                  type="radio"
                  name="preset"
                  value={p.value}
                  checked={selected}
                  onChange={() => setPreset(p.value)}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                      selected
                        ? "border-neutral-900 dark:border-neutral-100"
                        : "border-neutral-400 dark:border-neutral-600"
                    }`}
                  >
                    {selected ? (
                      <div className="m-0.5 h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {p.description}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="customInstructions" className="text-sm font-medium">
          Instruções customizadas
        </label>
        <textarea
          id="customInstructions"
          name="customInstructions"
          defaultValue={initialCustom}
          rows={5}
          maxLength={2000}
          placeholder="Ex.: Responda como se fosse um sommelier explicando vinhos. Use metáforas enogastronômicas e termine sempre perguntando se a pessoa quer sugestões."
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Usado apenas quando o preset é Custom. Limite de 2000 caracteres.
        </p>
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
