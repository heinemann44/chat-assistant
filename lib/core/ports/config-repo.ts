import type { Tone } from "../types";

export type LlmRuntimeConfig = {
  provider: "stub" | "anthropic" | "openai" | "zai";
  model: string | null;
  apiKeySecretId: string | null;
  temperature: number;
  maxTokens: number;
  systemExtras: string | null;
};

export type HandoffRuntimeConfig = {
  notifyChannel: "telegram" | "email" | "webhook";
  notifyTarget: string | null;
  autoResumeMinutes: number;
  triggerKeywords: string[];
};

export type ChannelInstanceSummary = {
  id: string;
  tenantId: string;
  type: "telegram" | "whatsapp" | "slack" | "discord";
  name: string;
  enabled: boolean;
  webhookSecret: string;
  botTokenSecretId: string | null;
};

// Reads tenant-scoped configuration the pipeline needs. Implementations are
// expected to be the source of truth; pipeline never reads config directly.
export interface ConfigRepo {
  getChannelInstanceById(id: string): Promise<ChannelInstanceSummary | null>;
  getTone(tenantId: string): Promise<Tone>;
  getLlmConfig(tenantId: string): Promise<LlmRuntimeConfig>;
  getHandoffConfig(tenantId: string): Promise<HandoffRuntimeConfig>;
}
