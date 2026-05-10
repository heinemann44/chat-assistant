import type { LlmRuntimeConfig } from "@/lib/core/ports/config-repo";
import type { LLMProvider } from "@/lib/core/ports/llm-provider";
import { getDecryptedSecret } from "@/lib/db/vault";

import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { StubProvider } from "./stub";

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
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

  const opts = {
    apiKey,
    model: config.model ?? DEFAULT_MODELS[config.provider],
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  };

  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(opts);
    case "openai":
      return new OpenAIProvider(opts);
  }
}
