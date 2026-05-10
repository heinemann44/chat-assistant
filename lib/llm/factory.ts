import type { LlmRuntimeConfig } from "@/lib/core/ports/config-repo";
import type { LLMProvider } from "@/lib/core/ports/llm-provider";

import { StubProvider } from "./stub";

// Resolves an LLMProvider from llm_config. Anthropic/OpenAI are wired in
// Phase 6; until then everything resolves to the stub regardless of config so
// the rest of the pipeline can be exercised end-to-end without API keys.
export function createLLMProvider(_config: LlmRuntimeConfig): LLMProvider {
  return new StubProvider();
}
