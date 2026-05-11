"use client";

import { useActionState, useState } from "react";

import { updateLlmConfig, type UpdateLlmState } from "./actions";

type Provider = "stub" | "anthropic" | "openai" | "zai";
type ZaiPlan = "paas" | "coding";

const initialState: UpdateLlmState = {};

const PROVIDER_DEFAULTS: Record<Exclude<Provider, "stub" | "zai">, { model: string; hint: string }> = {
  anthropic: {
    model: "claude-sonnet-4-6",
    hint: "Chaves começam com sk-ant-…",
  },
  openai: {
    model: "gpt-4o-mini",
    hint: "Chaves começam com sk-… Use uma chave de projeto, não a master.",
  },
};

const ZAI_DEFAULTS: Record<ZaiPlan, { model: string; hint: string; description: string }> = {
  paas: {
    model: "glm-4.6",
    hint: "Pay-per-use. Requer saldo na conta z.ai.",
    description: "Endpoint api.z.ai/api/paas/v4. Cobrança por uso.",
  },
  coding: {
    model: "GLM-4.5-air",
    hint: "GLM Coding Plan. Usa a quota da sua assinatura.",
    description: "Endpoint api.z.ai/api/coding/paas/v4. Modelos: GLM-5.1, GLM-4.7, GLM-4.5-air.",
  },
};

type Props = {
  initial: {
    provider: Provider;
    model: string;
    hasApiKey: boolean;
    temperature: number;
    maxTokens: number;
    systemExtras: string;
    zaiPlan: ZaiPlan;
  };
};

export function LlmForm({ initial }: Props) {
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [zaiPlan, setZaiPlan] = useState<ZaiPlan>(initial.zaiPlan);
  const [state, formAction, pending] = useActionState(updateLlmConfig, initialState);

  const isStub = provider === "stub";
  const isZai = provider === "zai";
  const defaults = isStub
    ? null
    : isZai
    ? { model: ZAI_DEFAULTS[zaiPlan].model, hint: ZAI_DEFAULTS[zaiPlan].hint }
    : PROVIDER_DEFAULTS[provider as "anthropic" | "openai"];

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Provider</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["stub", "anthropic", "openai", "zai"] as Provider[]).map((p) => {
            const selected = provider === p;
            return (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border p-3 text-center transition-colors ${
                  selected
                    ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p}
                  checked={selected}
                  onChange={() => setProvider(p)}
                  className="sr-only"
                />
                <div className="text-sm font-medium">
                  {p === "zai" ? "Z.AI" : p.charAt(0).toUpperCase() + p.slice(1)}
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {p === "stub"
                    ? "Determinístico (sem custo)"
                    : p === "anthropic"
                    ? "Claude (Sonnet 4.6)"
                    : p === "openai"
                    ? "GPT (4o-mini)"
                    : "GLM (4.6)"}
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {isZai ? (
        <fieldset className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Plano Z.AI
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["paas", "coding"] as ZaiPlan[]).map((p) => {
              const selected = zaiPlan === p;
              return (
                <label
                  key={p}
                  className={`cursor-pointer rounded-md border p-3 transition-colors ${
                    selected
                      ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800"
                      : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="zaiPlan"
                    value={p}
                    checked={selected}
                    onChange={() => setZaiPlan(p)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium">
                    {p === "paas" ? "Pay-per-use" : "Coding Plan"}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {ZAI_DEFAULTS[p].description}
                  </p>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="zaiPlan" value={zaiPlan} />
      )}

      {!isStub ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="model" className="text-sm font-medium">
              Modelo
            </label>
            <input
              id="model"
              name="model"
              defaultValue={initial.model || defaults?.model}
              placeholder={defaults?.model}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API key {initial.hasApiKey ? "(deixe em branco pra manter)" : ""}
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={initial.hasApiKey ? "••••••••••••••••" : defaults?.hint}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{defaults?.hint}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="temperature" className="text-sm font-medium">
            Temperatura
          </label>
          <input
            id="temperature"
            name="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            defaultValue={initial.temperature}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            0 = determinístico, 1 = padrão, 2 = bem criativo.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="maxTokens" className="text-sm font-medium">
            Max tokens
          </label>
          <input
            id="maxTokens"
            name="maxTokens"
            type="number"
            min="1"
            max="8192"
            defaultValue={initial.maxTokens}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Limite de tokens da resposta. 1024 é um bom default.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="systemExtras" className="text-sm font-medium">
          Instruções extras de system
        </label>
        <textarea
          id="systemExtras"
          name="systemExtras"
          rows={4}
          maxLength={4000}
          defaultValue={initial.systemExtras}
          placeholder="Ex.: Nunca mencione preços; sempre redirecione perguntas comerciais para vendas@empresa.com."
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Anexado ao system prompt depois do tom. Bom pra políticas globais.
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
