import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Single-tenant in product today; schema is multi-tenant ready.
// Every row carries `tenant_id`. RLS scopes authenticated reads/writes.

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Links a Supabase auth.users row to a tenant. Created on first login.
export const adminUsers = pgTable(
  "admin_users",
  {
    userId: uuid("user_id").primaryKey(), // FK to auth.users(id), enforced in SQL migration
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("admin_users_role_check", sql`${t.role} IN ('owner', 'member')`),
    index("idx_admin_users_tenant_id").on(t.tenantId),
  ],
);

// One row per bot/integration. Webhook URL embeds the row id.
export const channelInstances = pgTable(
  "channel_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    botTokenSecretId: uuid("bot_token_secret_id"), // references vault.secrets(id)
    webhookSecret: text("webhook_secret").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("channel_instances_type_check", sql`${t.type} IN ('telegram', 'whatsapp', 'slack', 'discord')`),
    index("idx_channel_instances_tenant_id").on(t.tenantId),
  ],
);

export const llmConfig = pgTable(
  "llm_config",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("stub"),
    model: text("model"),
    apiKeySecretId: uuid("api_key_secret_id"), // references vault.secrets(id)
    temperature: numeric("temperature", { precision: 3, scale: 2 }).notNull().default("0.7"),
    maxTokens: integer("max_tokens").notNull().default(1024),
    systemExtras: text("system_extras"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("llm_config_provider_check", sql`${t.provider} IN ('stub', 'anthropic', 'openai', 'zai')`)],
);

export const toneConfig = pgTable(
  "tone_config",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    preset: text("preset").notNull().default("casual"),
    customInstructions: text("custom_instructions"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("tone_config_preset_check", sql`${t.preset} IN ('formal', 'casual', 'descontraido', 'custom')`)],
);

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_faqs_tenant_id_enabled").on(t.tenantId, t.enabled)],
);

export const handoffConfig = pgTable(
  "handoff_config",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    notifyChannel: text("notify_channel").notNull().default("telegram"),
    notifyTarget: text("notify_target"), // chat_id, email, or webhook URL
    autoResumeMinutes: integer("auto_resume_minutes").notNull().default(30),
    triggerKeywords: text("trigger_keywords")
      .array()
      .notNull()
      .default(sql`ARRAY['atendente', 'humano', 'pessoa', 'falar com']::text[]`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("handoff_config_notify_channel_check", sql`${t.notifyChannel} IN ('telegram', 'email', 'webhook')`),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    channelInstanceId: uuid("channel_instance_id")
      .notNull()
      .references(() => channelInstances.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    externalUserName: text("external_user_name"),
    lastMessages: jsonb("last_messages").notNull().default(sql`'[]'::jsonb`),
    state: text("state").notNull().default("active"),
    handoffUntil: timestamp("handoff_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("conversations_state_check", sql`${t.state} IN ('active', 'handoff_active')`),
    unique("uq_conversations_channel_user").on(t.channelInstanceId, t.externalUserId),
    index("idx_conversations_tenant_id").on(t.tenantId),
  ],
);

export const handoffEvents = pgTable(
  "handoff_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    reason: text("reason"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"), // FK to auth.users(id), enforced in SQL migration
  },
  (t) => [index("idx_handoff_events_tenant_id").on(t.tenantId)],
);
