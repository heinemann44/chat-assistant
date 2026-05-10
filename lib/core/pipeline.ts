import { classifyIntent } from "./intent/classifier";
import type { LLMProvider } from "./ports/llm-provider";
import { buildSystemPrompt } from "./tone/prompt-builder";
import type {
  ConversationMessage,
  IncomingMessage,
  Intent,
  OutgoingMessage,
  Tone,
} from "./types";

const INTENT_HINTS: Partial<Record<Intent, string>> = {
  saudacao:
    "O usuário acabou de cumprimentar. Retribua a saudação de forma breve e cordial e ofereça ajuda.",
};

export type PipelineDeps = {
  llm: LLMProvider;
};

export type PipelineInput = {
  incoming: IncomingMessage;
  tone: Tone;
  systemExtras?: string | null;
  history?: ConversationMessage[];
};

export type PipelineResult = {
  intent: Intent;
  replies: OutgoingMessage[];
};

export async function processMessage(
  input: PipelineInput,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { incoming, tone, systemExtras, history = [] } = input;

  const intent = classifyIntent(incoming.text);
  const systemPrompt = buildSystemPrompt({
    tone,
    intentHint: INTENT_HINTS[intent],
    systemExtras,
  });

  const messages: ConversationMessage[] = [
    ...history,
    {
      role: "user",
      text: incoming.text,
      at: incoming.receivedAt.toISOString(),
    },
  ];

  const text = await deps.llm.complete({ systemPrompt, messages });

  return {
    intent,
    replies: [{ text }],
  };
}
