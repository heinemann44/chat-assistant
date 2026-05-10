import { eq } from "drizzle-orm";

import type {
  ChannelInstanceSummary,
  ConfigRepo,
  HandoffRuntimeConfig,
  LlmRuntimeConfig,
} from "@/lib/core/ports/config-repo";
import type { Tone, TonePreset } from "@/lib/core/types";

import { db } from "../client";
import {
  channelInstances,
  handoffConfig,
  llmConfig,
  toneConfig,
} from "../schema";

export class DrizzleConfigRepo implements ConfigRepo {
  async getChannelInstanceById(id: string): Promise<ChannelInstanceSummary | null> {
    const row = await db.query.channelInstances.findFirst({
      where: eq(channelInstances.id, id),
    });
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      type: row.type as ChannelInstanceSummary["type"],
      name: row.name,
      enabled: row.enabled,
      webhookSecret: row.webhookSecret,
      botTokenSecretId: row.botTokenSecretId,
    };
  }

  async getTone(tenantId: string): Promise<Tone> {
    const row = await db.query.toneConfig.findFirst({
      where: eq(toneConfig.tenantId, tenantId),
    });
    if (!row) {
      return { preset: "casual" };
    }
    return {
      preset: row.preset as TonePreset,
      customInstructions: row.customInstructions,
    };
  }

  async getLlmConfig(tenantId: string): Promise<LlmRuntimeConfig> {
    const row = await db.query.llmConfig.findFirst({
      where: eq(llmConfig.tenantId, tenantId),
    });
    if (!row) {
      return {
        provider: "stub",
        model: null,
        apiKeySecretId: null,
        temperature: 0.7,
        maxTokens: 1024,
        systemExtras: null,
      };
    }
    return {
      provider: row.provider as LlmRuntimeConfig["provider"],
      model: row.model,
      apiKeySecretId: row.apiKeySecretId,
      temperature: Number(row.temperature),
      maxTokens: row.maxTokens,
      systemExtras: row.systemExtras,
    };
  }

  async getHandoffConfig(tenantId: string): Promise<HandoffRuntimeConfig> {
    const row = await db.query.handoffConfig.findFirst({
      where: eq(handoffConfig.tenantId, tenantId),
    });
    if (!row) {
      return {
        notifyChannel: "telegram",
        notifyTarget: null,
        autoResumeMinutes: 30,
        triggerKeywords: [],
      };
    }
    return {
      notifyChannel: row.notifyChannel as HandoffRuntimeConfig["notifyChannel"],
      notifyTarget: row.notifyTarget,
      autoResumeMinutes: row.autoResumeMinutes,
      triggerKeywords: row.triggerKeywords,
    };
  }
}
