import type { LLMRequest } from "@/lib/core/ports/llm-provider";

// Shared wire format for OpenAI's /chat/completions API and any provider that
// mirrors it (Z.AI/GLM, Groq, Together, etc.). Differences are only in the
// base URL, default model, and provider label in error messages.

export type ChatCompletionOptions = {
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  providerName: string; // used in error messages
};

type ChatCompletionsResponse = {
  choices: Array<{ message?: { content?: string }; finish_reason?: string }>;
};

export async function openAICompatibleComplete(
  opts: ChatCompletionOptions,
  request: LLMRequest,
): Promise<string> {
  const messages = [
    { role: "system" as const, content: request.systemPrompt },
    ...request.messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    })),
  ];

  const res = await fetch(opts.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${opts.providerName} ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as ChatCompletionsResponse;
  const text = (json.choices[0]?.message?.content ?? "").trim();
  if (!text) {
    throw new Error(`${opts.providerName} returned empty content`);
  }
  return text;
}
