"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";

import type { TonePreset } from "@/lib/core/types";

import { updateTone, type UpdateToneState } from "./actions";

const PRESETS: Array<{ value: TonePreset; label: string; description: string }> = [
  {
    value: "formal",
    label: "Formal",
    description:
      "Respeitoso e profissional. Trata por “você” com cortesia. Sem gírias nem emojis.",
  },
  {
    value: "casual",
    label: "Casual",
    description:
      "Amigável e claro, sem ser informal demais. Emojis só quando realmente couberem.",
  },
  {
    value: "descontraido",
    label: "Descontraído",
    description: "Leve, com bom humor. Gírias suaves e emojis ocasionais.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Instruções livres no campo abaixo (substitui os presets).",
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
                className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:bg-surface-3"
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
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <p className="text-xs text-fg-muted">{p.description}</p>
                  </div>
                  <span
                    aria-hidden
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-strong"
                    }`}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
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
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-fg-muted">
          Usado apenas quando o preset é Custom. Limite de 2000 caracteres.
        </p>
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
