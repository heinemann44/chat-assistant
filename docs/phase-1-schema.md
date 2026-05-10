# Phase 1 — Schema do banco

**Status:** ✅ Concluída
**Objetivo:** Modelo de dados completo, RLS ativo, tenant default seedado.

## O que foi feito

- **Schema Drizzle** ([lib/db/schema.ts](../lib/db/schema.ts)) com 9 tabelas, types source-of-truth pra queries no app
- **4 migrations aplicadas** no Supabase via MCP (vide `mcp__supabase__list_migrations`):
  1. `init_schema` — tabelas + índices + função `set_updated_at()` + triggers
  2. `rls_policies` — RLS habilitado em todas + função `current_tenant_id()` + policies por role
  3. `seed_default_tenant` — tenant default + 3 rows de config + trigger em `auth.users`
  4. `harden_function_security` — correções dos warnings do advisor
- **Advisor de segurança**: 0 lints após hardening ✓

## Modelo de dados

| Tabela | Cardinalidade | Função |
|---|---|---|
| `tenants` | 1 row (MVP) | Raiz do isolamento multi-tenant |
| `admin_users` | 1:N → tenants | Liga `auth.users` ao tenant; criada via trigger no signup |
| `channel_instances` | 1:N → tenants | Bot Telegram/WhatsApp/etc. Token guardado no Vault |
| `llm_config` | 1:1 → tenants | Provider + modelo + API key (Vault) + temperatura |
| `tone_config` | 1:1 → tenants | Preset (formal/casual/descontraido/custom) + instruções extras |
| `faqs` | 1:N → tenants | Pergunta + resposta + keywords + flag enabled |
| `handoff_config` | 1:1 → tenants | Canal de notificação + target + palavras-gatilho + minutos de auto-resume |
| `conversations` | 1:N → tenants | Estado por (`channel_instance_id`, `external_user_id`) com janela das últimas N mensagens |
| `handoff_events` | 1:N → tenants | Log auditável de handoffs |

Toda tabela com `created_at`/`updated_at` tem trigger `set_updated_at` BEFORE UPDATE.

## RLS

- **Service role** (webhooks + server actions sensíveis): bypass automático
- **Authenticated** (admins logados): CRUD restrito ao próprio tenant via `current_tenant_id()`
- **Anon**: sem acesso

Tabelas só-leitura pra `authenticated`: `tenants`, `admin_users` (própria row), `conversations` (+ UPDATE pra encerrar handoff), `handoff_events` (+ UPDATE).
CRUD completo pra `authenticated`: `channel_instances`, `llm_config`, `tone_config`, `faqs`, `handoff_config`.

## Segredos

- **`channel_instances.bot_token_secret_id`** → `vault.secrets(id)` (Telegram bot token)
- **`llm_config.api_key_secret_id`** → `vault.secrets(id)` (Anthropic/OpenAI API key)
- Coluna é só UUID, sem FK cross-schema. Aplicação resolve via `vault.decrypted_secrets`.

## Decisões

- **Drizzle ≠ migration source-of-truth**. Schema Drizzle existe pra typing; migrations vivem no Supabase (`list_migrations`). Sync é manual mas o checkin do schema.ts garante alinhamento revisável.
- **`current_tenant_id()` é `SECURITY INVOKER`** — RLS em `admin_users` (`user_id = auth.uid()`) já dá ao caller acesso à própria row. SECURITY DEFINER seria desnecessariamente perigoso.
- **`handle_new_auth_user()` é `SECURITY DEFINER`** (precisa pra inserir em `admin_users` de dentro do trigger em `auth.users`), mas EXECUTE foi revogado de `PUBLIC`, `anon`, `authenticated` pra não ser chamável via PostgREST RPC.
- **`set_updated_at()` com `SET search_path = public`** — proteção contra hijack via objetos shadow.
- **`conversations.handoff_until`** indexada apenas onde `state = 'handoff_active'` — índice parcial pra o cron de expiração ser eficiente.

## Pendências passadas adiante

- **`pg_cron` não instalado** — ativar na Phase 8 pra expirar handoffs automaticamente.
- **`vault` integração no app** — Phases 4 (channel) e 6 (LLM) precisam ler/escrever segredos via `vault.create_secret` / `vault.decrypted_secrets`.
- **`admin_users` ainda vazio** — encherá quando você fizer o primeiro login na Phase 2 (o trigger `on_auth_user_created` cuida disso).

## IDs úteis

- **Default tenant ID**: `ee5a70f9-1d50-4cda-a421-90f9124e2f77`

## Commit

A ser feito após este doc.
