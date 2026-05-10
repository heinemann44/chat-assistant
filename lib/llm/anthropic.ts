import type { LLMProvider, LLMRequest } from "@/lib/core/ports/llm-provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
};

export type AnthropicOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";

  constructor(private readonly options: AnthropicOptions) {}

  async complete(request: LLMRequest): Promise<string> {
    const { apiKey, model, maxTokens, temperature } = this.options;

    const messages = request.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    }));

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: request.systemPrompt,
        messages,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as AnthropicResponse;
    const text = json.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Anthropic returned empty content");
    }
    return text;
  }
}
