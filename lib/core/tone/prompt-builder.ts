import type { FaqItem } from "../ports/config-repo";
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

const FAQ_INSTRUCTIONS =
  "Quando a pergunta do usuário casar com algum item da base de conhecimento abaixo, responda usando a informação correspondente, " +
  "ajustando ao tom configurado. Se nenhuma FAQ se encaixar, responda naturalmente sem inventar dados sobre o negócio.";

export type SystemPromptOptions = {
  tone: Tone;
  intentHint?: string;
  systemExtras?: string | null;
  faqs?: FaqItem[];
};

export function buildSystemPrompt({
  tone,
  intentHint,
  systemExtras,
  faqs,
}: SystemPromptOptions): string {
  const toneText =
    tone.preset === "custom"
      ? (tone.customInstructions?.trim() ?? "")
      : PRESET_INSTRUCTIONS[tone.preset];

  const faqBlock =
    faqs && faqs.length > 0
      ? `${FAQ_INSTRUCTIONS}\n\nBase de conhecimento:\n${faqs
          .map((f, i) => `${i + 1}. P: ${f.question}\n   R: ${f.answer}`)
          .join("\n")}`
      : undefined;

  return [BASE, toneText, intentHint, faqBlock, systemExtras]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))
    .join("\n\n");
}
