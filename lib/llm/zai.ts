import type { LLMProvider, LLMRequest } from "@/lib/core/ports/llm-provider";

import { openAICompatibleComplete } from "./openai-compatible";

export type ZaiPlan = "paas" | "coding";

const ENDPOINTS: Record<ZaiPlan, string> = {
  // Pay-per-use (metered, requires balance).
  paas: "https://api.z.ai/api/paas/v4/chat/completions",
  // Subscription (GLM Coding Plan, uses quota from the plan).
  coding: "https://api.z.ai/api/coding/paas/v4/chat/completions",
};

export type ZaiOptions = {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  plan: ZaiPlan;
};

export class ZaiProvider implements LLMProvider {
  readonly name = "zai";

  constructor(private readonly options: ZaiOptions) {}

  async complete(request: LLMRequest): Promise<string> {
    const endpoint = ENDPOINTS[this.options.plan];
    return openAICompatibleComplete(
      {
        endpoint,
        apiKey: this.options.apiKey,
        model: this.options.model,
        maxTokens: this.options.maxTokens,
        temperature: this.options.temperature,
        providerName: `Z.AI (${this.options.plan})`,
        // GLM thinking models default to enabled, which yields long latency
        // and frequently leaves content empty (reply lands in reasoning_content).
        // Disable for a clean OpenAI-style reply.
        extraBody: { thinking: { type: "disabled" } },
      },
      request,
    );
  }
}
