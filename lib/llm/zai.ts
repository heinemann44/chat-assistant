import type { LLMProvider, LLMRequest } from "@/lib/core/ports/llm-provider";

import { openAICompatibleComplete } from "./openai-compatible";

const ENDPOINT = "https://api.z.ai/api/paas/v4/chat/completions";

export type ZaiOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

export class ZaiProvider implements LLMProvider {
  readonly name = "zai";

  constructor(private readonly options: ZaiOptions) {}

  async complete(request: LLMRequest): Promise<string> {
    return openAICompatibleComplete(
      { ...this.options, endpoint: ENDPOINT, providerName: "Z.AI" },
      request,
    );
  }
}
