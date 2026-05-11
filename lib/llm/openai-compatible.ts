import type { LLMRequest } from "@/lib/core/ports/llm-provider";
import { logger } from "@/lib/logger";

// Shared wire format for OpenAI's /chat/completions API and any provider that
// mirrors it (Z.AI/GLM, Groq, Together, etc.). Differences are only in the
// base URL, default model, provider label, and any provider-specific fields
// merged into the request body.

export type ChatCompletionOptions = {
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  providerName: string; // used in error messages
  extraBody?: Record<string, unknown>; // provider-specific body fields (e.g. z.ai's `thinking`)
};

type ChatCompletionsResponse = {
  choices: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string;
  }>;
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
      ...(opts.extraBody ?? {}),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${opts.providerName} ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as ChatCompletionsResponse;
  const message = json.choices[0]?.message;
  // Some "thinking" models (GLM-4.5+, etc.) put the user-facing reply in
  // reasoning_content when content stays empty. Fall back to that.
  const text = (message?.content ?? message?.reasoning_content ?? "").trim();
  if (!text) {
    logger.warn(
      { provider: opts.providerName, response: JSON.stringify(json).slice(0, 800) },
      "empty content from LLM",
    );
    throw new Error(`${opts.providerName} returned empty content`);
  }
  return text;
}
