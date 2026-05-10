# Phase 4 — Canal Telegram + página `/channels`

**Status:** ✅ Concluída
**Objetivo:** Conectar um bot Telegram pelo painel, receber mensagens via webhook, responder pelo stub. Repos do banco entram em cena; arquitetura de adapter/port valida na prática.

## O que foi feito

### Domínio (ports)

- [`lib/core/ports/config-repo.ts`](../lib/core/ports/config-repo.ts) — `ConfigRepo` lê `channel_instances`, `tone_config`, `llm_config`, `handoff_config`
- [`lib/core/ports/conversation-repo.ts`](../lib/core/ports/conversation-repo.ts) — `ConversationRepo` faz `getOrCreate` + `appendMessages` com janela deslizante

### Implementações Drizzle

- [`lib/db/repos/config-repo.ts`](../lib/db/repos/config-repo.ts) e [`conversation-repo.ts`](../lib/db/repos/conversation-repo.ts) — usam o `db` (pooler do Supabase, role `postgres` → bypassa RLS)
- [`lib/db/vault.ts`](../lib/db/vault.ts) — `getDecryptedSecret(id)` lê de `vault.decrypted_secrets`

### Telegram

- [`lib/channels/telegram/api.ts`](../lib/channels/telegram/api.ts) — wrapper fino (`getMe`, `sendMessage`, `setWebhook`, `deleteWebhook`) via `fetch`. Grammy ficou de fora — só precisamos do essencial em serverless.
- [`lib/channels/telegram/parse.ts`](../lib/channels/telegram/parse.ts) — valida payload do Telegram com zod, devolve `IncomingMessage` ou `ignored`
- [`lib/channels/telegram/adapter.ts`](../lib/channels/telegram/adapter.ts) — `TelegramAdapter implements ChannelAdapter`
- 5 testes vitest novos pro parser (39 total agora)

### Webhook

- [`app/api/channels/telegram/webhook/[id]/route.ts`](../app/api/channels/telegram/webhook/%5Bid%5D/route.ts) — POST que:
  1. Resolve `channel_instance` pelo `[id]`
  2. Valida `X-Telegram-Bot-Api-Secret-Token` com `timingSafeEqual`
  3. Decifra bot token via `getDecryptedSecret`
  4. Carrega tom + llm_config + conversa em paralelo
  5. Roda pipeline com `StubProvider`
  6. Envia resposta pelo Bot API
  7. Anexa user msg + reply em `conversations.last_messages` (janela 20)

### Admin

- [`app/(admin)/channels/page.tsx`](../app/%28admin%29/channels/page.tsx) — server component, lista canais via Supabase JS (RLS scoped)
- [`channel-form.tsx`](../app/%28admin%29/channels/channel-form.tsx) — client form com `useActionState`
- [`channel-list.tsx`](../app/%28admin%29/channels/channel-list.tsx) — server component renderiza lista + forms de toggle/excluir
- [`actions.ts`](../app/%28admin%29/channels/actions.ts) — server actions:
  - `createTelegramChannel`: zod valida → `getMe` valida no Telegram → RPC `create_telegram_channel` (atômico: vault.secret + row) → patch do `config.telegram` com `bot_id`/`username`/`first_name` → `setWebhook`
  - `deleteTelegramChannel`: RLS-scoped lookup → `deleteWebhook` (best effort) → RPC `delete_channel_instance`
  - `toggleChannelEnabled`: update RLS-scoped

### Migrations

- `channel_instance_rpcs` — `public.create_telegram_channel(name, bot_token)` e `public.delete_channel_instance(id)`, ambas `SECURITY DEFINER`, `SET search_path = public, extensions`, EXECUTE só pra `authenticated`
- `explicit_revoke_anon_rpc` — revoga explicitamente `anon` pra zerar warning do linter

### Infra

- [`lib/logger.ts`](../lib/logger.ts) — pino com nível via env
- Proxy ([`lib/supabase/proxy.ts`](../lib/supabase/proxy.ts)) agora bypassa **early** rotas `/api/*` — webhooks não pagam roundtrip de Supabase Auth

## Decisões

- **Drizzle ≠ Supabase JS, com regra clara:**
  - **Drizzle** (pooler como `postgres`): código servidor sem usuário (webhook, vault reads). Bypassa RLS.
  - **Supabase JS** (`createSupabaseServerClient`): código sob sessão de admin. RLS aplica.
  Isso vai pro AGENTS.md no próximo update.
- **Criação atômica via RPC SECURITY DEFINER** — `authenticated` não tem acesso ao schema `vault`. A RPC encapsula `vault.create_secret + insert channel_instance` numa transação, com `tenant_id = current_tenant_id()` por dentro.
- **Bot token NUNCA volta pro cliente.** Validação (`getMe`) acontece no server action antes de salvar; vault só é decifrado em código privilegiado (webhook handler, action de delete).
- **`timingSafeEqual` no header secret** — overkill prático (tokens são alta entropia) mas é o padrão e custa nada.
- **Telegram retries** — quase tudo retorna 200, exceto secret mismatch (401, faz probing aparecer no log). Erros internos são logados mas devolvem 200 pra não disparar retry storm.
- **`prepare: false` no pg client** (já era da Phase 0) — confirmado necessário pro pooler do Supabase em modo transaction
- **Stub continua sendo o LLM** — factory existe e respeita `llm_config.provider`, mas devolve `StubProvider` sempre. Real providers entram na Phase 6.

## Como testar

1. **`.env.local`** precisa ter agora (além do que Phase 2 pediu):
   - `DATABASE_URL` (transaction pooler do Supabase, port 6543)
   - `APP_URL` apontando pra URL pública do app
2. Em dev: `ngrok http 3000` e use a URL `https://*.ngrok-free.app` como `APP_URL`
3. Em prod: `APP_URL=https://<seu-app>.vercel.app`
4. Crie um bot no `@BotFather`, copie o token
5. No painel `/channels`: nome + token → "Conectar"
6. Mande "oi" no bot pelo Telegram → recebe resposta do stub com tom default (casual)

## Pendências passadas adiante

- **LLM real** (Phase 6) — `factory.ts` é trivial de estender
- **Detecção/notificação de handoff** (Phase 8) — `handoff_config` já existe, falta wire no pipeline
- **FAQs** (Phase 7) — repo + matcher
- **Logs em produção** — pino imprime JSON, Vercel captura, mas falta dashboard de observabilidade. Suficiente pro MVP.
- **Rate limit por `external_user_id`** — Phase 9 polish. Hoje um usuário pode martelar o bot e estourar custo de LLM quando ligar provider real.
- **`auth_leaked_password_protection`** continua disabled (warn do advisor). Recomendo ligar em Authentication → Providers → Email no dashboard quando der.

## Arquivos novos/modificados

```
app/(admin)/channels/page.tsx                    [novo]
app/(admin)/channels/channel-form.tsx            [novo]
app/(admin)/channels/channel-list.tsx            [novo]
app/(admin)/channels/actions.ts                  [novo]
app/api/channels/telegram/webhook/[id]/route.ts  [novo]
lib/channels/telegram/api.ts                     [novo]
lib/channels/telegram/parse.ts                   [novo]
lib/channels/telegram/parse.test.ts              [novo]
lib/channels/telegram/adapter.ts                 [novo]
lib/core/ports/config-repo.ts                    [novo]
lib/core/ports/conversation-repo.ts              [novo]
lib/db/repos/config-repo.ts                      [novo]
lib/db/repos/conversation-repo.ts                [novo]
lib/db/vault.ts                                  [novo]
lib/llm/factory.ts                               [novo]
lib/logger.ts                                    [novo]
lib/supabase/proxy.ts                            [editado: bypass /api/]
.env.example                                     [editado: contexto Drizzle/APP_URL]
```

## Migrations aplicadas

- `channel_instance_rpcs`
- `explicit_revoke_anon_rpc`

Advisor: 2 warnings esperados (`authenticated_security_definer_function_executable` nos RPCs intencionais — eles validam tenant internamente) + 1 setting de dashboard (`auth_leaked_password_protection`).

## Commit

A ser feito após este doc.
