import type { LLMProvider, LLMRequest } from "@/lib/core/ports/llm-provider";

const API_URL = "https://api.openai.com/v1/chat/completions";

type OpenAIResponse = {
  choices: Array<{ message?: { content?: string }; finish_reason?: string }>;
};

export type OpenAIOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  constructor(private readonly options: OpenAIOptions) {}

  async complete(request: LLMRequest): Promise<string> {
    const { apiKey, model, maxTokens, temperature } = this.options;

    const messages = [
      { role: "system" as const, content: request.systemPrompt },
      ...request.messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    ];

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as OpenAIResponse;
    const text = (json.choices[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("OpenAI returned empty content");
    }
    return text;
  }
}
