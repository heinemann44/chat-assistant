import type { LlmRuntimeConfig } from "@/lib/core/ports/config-repo";
import type { LLMProvider } from "@/lib/core/ports/llm-provider";
import { getDecryptedSecret } from "@/lib/db/vault";

import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { StubProvider } from "./stub";
import { ZaiProvider } from "./zai";

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  zai_paas: "glm-4.6",
  zai_coding: "GLM-4.5-air",
} as const;

// Resolves an LLMProvider from llm_config. Reads the API key from the vault
// at call time so a rotated key picks up without a redeploy. If the config
// is incomplete (e.g., provider set but no api_key_secret_id), falls back to
// the stub so the admin can still test the rest of the pipeline.
export async function createLLMProvider(config: LlmRuntimeConfig): Promise<LLMProvider> {
  if (config.provider === "stub" || !config.apiKeySecretId) {
    return new StubProvider();
  }

  const apiKey = await getDecryptedSecret(config.apiKeySecretId);
  if (!apiKey) {
    return new StubProvider();
  }

  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider({
        apiKey,
        model: config.model ?? DEFAULT_MODELS.anthropic,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });
    case "openai":
      return new OpenAIProvider({
        apiKey,
        model: config.model ?? DEFAULT_MODELS.openai,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });
    case "zai":
      return new ZaiProvider({
        apiKey,
        model:
          config.model ??
          (config.zaiPlan === "coding"
            ? DEFAULT_MODELS.zai_coding
            : DEFAULT_MODELS.zai_paas),
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        plan: config.zaiPlan,
      });
  }
}
