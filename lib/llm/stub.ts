import type { LLMProvider, LLMRequest } from "@/lib/core/ports/llm-provider";

// Deterministic placeholder used until a real provider is wired in Phase 6.
// Tries to honor the tone hinted in the system prompt so the round trip is
// still meaningful in development and tests.
export class StubProvider implements LLMProvider {
  readonly name = "stub";

  async complete(request: LLMRequest): Promise<string> {
    const last = request.messages.at(-1);
    const userText = last?.text?.trim() ?? "";
    const prompt = request.systemPrompt.toLowerCase();

    const isGreetingHint = prompt.includes("cumprimentou");
    const tone = pickTone(prompt);

    if (isGreetingHint) {
      return tone.greeting;
    }

    if (!userText) {
      return tone.empty;
    }

    return `${tone.prefix}recebi sua mensagem ("${truncate(userText, 80)}"). Em que posso ajudar?`;
  }
}

function pickTone(systemPromptLower: string) {
  if (systemPromptLower.includes("tom formal")) {
    return {
      prefix: "Prezado(a), ",
      greeting: "Prezado(a), seja bem-vindo(a). Em que posso ajudar?",
      empty: "Prezado(a), poderia detalhar sua dúvida?",
    };
  }
  if (systemPromptLower.includes("tom descontra")) {
    return {
      prefix: "E aí! ",
      greeting: "E aí! Tudo certo? Como posso te ajudar?",
      empty: "Não recebi nenhum texto, pode mandar de novo?",
    };
  }
  return {
    prefix: "Olá! ",
    greeting: "Olá! Tudo bem? Em que posso ajudar?",
    empty: "Não recebi nenhum texto, pode mandar novamente?",
  };
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
