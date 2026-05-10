import type { Tone, TonePreset } from "../types";

const BASE =
  "Você é um assistente de atendimento ao cliente em português brasileiro. " +
  "Seja conciso, direto e útil. Responda em no máximo duas frases curtas, " +
  "salvo quando o usuário pedir explicitamente mais detalhe.";

const PRESET_INSTRUCTIONS: Record<Exclude<TonePreset, "custom">, string> = {
  formal:
    'Use tom formal e respeitoso. Trate o usuário por "você" com cortesia profissional. Evite gírias e emojis.',
  casual:
    "Use tom casual e amigável, sem ser informal demais. Linguagem clara e acessível. Sem gírias pesadas; emojis apenas se realmente couberem.",
  descontraido:
    "Use tom descontraído e leve, com bom humor moderado. Pode usar gírias suaves e emojis ocasionais quando ajudarem a conexão.",
};

export type SystemPromptOptions = {
  tone: Tone;
  intentHint?: string;
  systemExtras?: string | null;
};

export function buildSystemPrompt({ tone, intentHint, systemExtras }: SystemPromptOptions): string {
  const toneText =
    tone.preset === "custom"
      ? (tone.customInstructions?.trim() ?? "")
      : PRESET_INSTRUCTIONS[tone.preset];

  return [BASE, toneText, intentHint, systemExtras]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))
    .join("\n\n");
}
