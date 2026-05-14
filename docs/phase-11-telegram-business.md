# Phase 11 — Telegram Business

✅ Permitir que o assistente responda mensagens enviadas para o **número pessoal** do dono (não só para o bot), via API oficial de Telegram Business.

## Contexto

Até a fase 10, o sistema só recebia mensagens que o cliente enviava direto pro bot. O usuário queria que o cliente pudesse continuar mandando DM pro **número pessoal** dele (Telegram Business) e ainda assim o bot responder.

Investigação prévia (na própria conversa que originou essa fase) descartou MTProto userbot (ToS-violatório, exige host long-lived) e confirmou que a [API oficial de Business](https://core.telegram.org/api/business) cobre o caso. Validação manual via webhook.site fechou: fluxo completo (conectar → receber `business_message` → responder com `business_connection_id`) funciona. Premium do dono é requerido — o user já assinou.

## O que foi feito

### Schema

- Nova tabela [`telegram_business_connections`](../lib/db/schema.ts): 1 linha por conexão bot↔conta pessoal. Campos: `business_connection_id` (id opaco do Telegram), `owner_user_id`/`owner_username`, flags `can_reply`/`can_read`/`is_enabled`, `connected_at`/`disconnected_at`. RLS escopada por tenant via `current_tenant_id()`. Trigger `set_updated_at`. INSERT/DELETE só via service role (webhook); admin lê/atualiza via RLS.
- [`conversations`](../lib/db/schema.ts) ganhou coluna `business_connection_id` (text, nullable). UNIQUE antiga (`channel_instance_id, external_user_id`) substituída por **UNIQUE com `NULLS NOT DISTINCT`** sobre `(channel_instance_id, external_user_id, business_connection_id)`. Isso garante:
  - mesma pessoa que DM'a o bot direto e o número pessoal cria **duas conversas distintas** (contextos diferentes);
  - múltiplos NULLs no business_connection_id (modo bot direto) ainda são únicos pelo par (channel, user) — sem `NULLS NOT DISTINCT` o Postgres trataria NULLs como sempre distintos e abriria duplicatas.
- Migration: `20260514…_telegram_business_connections`.

### Parse

- [`parseTelegramUpdate`](../lib/channels/telegram/parse.ts) virou união discriminada: `message`, `business_message`, `business_connection`, `ignored`.
- `business_message` retorna `businessConnectionId` + `senderUserId` (necessário pra detectar o owner respondendo manualmente).
- `business_connection` aceita ambos os shapes: `rights.can_reply` (Bot API 9.0+) e `can_reply` no top-level (legacy).
- Cobertura: 7 testes novos em [parse.test.ts](../lib/channels/telegram/parse.test.ts) — total 13 nesse arquivo, 76 na suite.

### API + Adapter

- [`sendMessage`](../lib/channels/telegram/api.ts) ganhou `opts.businessConnectionId?: string` — quando presente, vai no body como `business_connection_id`. `setWebhook` agora pede `["message", "business_connection", "business_message"]` em `allowed_updates`.
- [`TelegramAdapter`](../lib/channels/telegram/adapter.ts) aceita `TelegramAdapterOptions` no construtor. `sendMessage` propaga o id; `notifyOwner` **não** propaga — owner notifications saem como bot direto, são meta-mensagens sobre a conversa.

### Webhook handler

- [`route.ts`](../app/api/channels/telegram/webhook/[id]/route.ts) virou um `switch` sobre `parsed.kind`:
  - `business_connection` → upsert em `telegram_business_connections` (lifecycle).
  - `business_message` → resolve a conexão, aplica gates (`!isEnabled`, `senderUserId === ownerUserId`, `!canReply`), depois despacha pro `processConversation` com o id propagado.
  - `message` → fluxo existente, com `businessConnectionId: null`.
- O pipeline em `lib/core/` **não mudou**: pipeline, intent, tone, rate-limit, handoff continuam recebendo `IncomingMessage` puro. A única alteração na borda foi o construtor do adapter.

### Frontend

- Card de canal em [/channels](../app/(admin)/channels) ganhou uma seção "Modo Business" — implementada como Client Component [`channel-business-section.tsx`](../app/(admin)/channels/channel-business-section.tsx). Estados:
  - **Sem conexão**: instruções colapsáveis em 3 passos (ligar Business Mode no @BotFather, dono conecta `@username` no app, clicar em "Atualizar webhook").
  - **Conectada e ativa**: badge verde "pode responder" + data de conexão.
  - **`can_reply: false`**: badge amarelo "sem permissão de resposta" + dica do que pedir pro dono.
  - **`is_enabled: false`**: badge cinza "desativado pelo dono" + data do disconnect.
- Server Action nova [`reregisterTelegramWebhook`](../app/(admin)/channels/actions.ts): re-chama `setWebhook` com os novos `allowed_updates`. Necessária 1x para canais criados antes desta fase.
- Tokens novos em [globals.css](../app/globals.css): `--warning`/`--warning-soft`/`--success-soft` (light + dark). Reaproveita o padrão de tokens existente.

## Decisões

### Por que tabela separada e não JSONB em `channel_instances`

- Lifecycle: precisa de timestamps (`connected_at`, `disconnected_at`) e flags mutáveis (`can_reply`, `is_enabled`) que mudam independentemente do bot. Coluna explícita > jsonb pra dados que vamos consultar e atualizar com frequência.
- Cardinalidade futura: Telegram limita 1 business bot por conta de usuário, mas inverso é livre — um bot pode estar conectado a N contas. JSONB suportaria, mas ficaria estranho.
- Auditoria: cada conexão é um evento — `disconnected_at` preservado mesmo depois que o dono reconecta (`is_enabled` volta a true, mas histórico fica).

### Por que conversas separadas (bot direto vs business)

Cliente X falando com o bot direto e com o número pessoal do dono são **chats diferentes do ponto de vista do cliente**. Misturar o histórico num único `conversations` row faria o LLM responder no canal errado com contexto cruzado. UNIQUE com `NULLS NOT DISTINCT` resolve sem campo "tipo": NULL = bot direto, valor = business mode.

### Por que `lib/core/` não mudou

Conferência da regra `lib/core/` não-importa-de-channels-ou-db do AGENTS.md: nenhum import novo no core, nenhuma interface mexida. O `ChannelAdapter` continua com `sendMessage(externalUserId, text)`. Toda complexidade de Business fica isolada em `lib/channels/telegram/`.

### Por que `notifyOwner` ignora `businessConnectionId`

`notifyOwner` é meta-mensagem (handoff disparado, alerta, etc.). Owner não quer receber isso "como se ele mesmo tivesse enviado" — quer receber **do bot**, num canal separado da conversa. Mantém o comportamento original.

### Por que o re-register é manual (botão por canal)

Canais criados antes desta fase estão com `allowed_updates: ["message"]` no Telegram, então o webhook nunca receberá `business_connection`. Script de migração que atualiza todos seria automático mas opaco — se algum bot tivesse token revogado, a falha ficaria silenciosa. Botão por canal mostra erro inline e o admin pode escolher quando atualizar.

## Pendências passadas adiante

- **`edited_business_message` / `deleted_business_messages`**: o parser ignora hoje. Útil pra UX (mostrar "mensagem editada/deletada" no histórico) mas não bloqueia o caso de uso. Fica pra fase futura quando tivermos uma view de log de conversas.
- **Conexão órfã**: se um `business_message` chegar antes do `business_connection` (improvável mas possível se nosso webhook esteve fora no momento da conexão), a mensagem é descartada com log de warning. Telegram não dá uma forma trivial de re-emitir o lifecycle — em produção, pediríamos pro dono desconectar e reconectar o bot. Não vale automatizar agora.
- **Métricas separadas**: dashboard hoje conta canais ativos, mas não diferencia mensagens via bot direto vs business. Fica pra fase de observabilidade.
- **Multi-tenant**: a UI atual lista conexões filtradas por RLS (cada admin vê só as do seu tenant). Quando virar multi-tenant real, nada muda do schema — só precisa garantir que o RLS continua escopando por `current_tenant_id()`.

## Como testar end-to-end

1. Pré-requisito: bot existente em `/channels` e Premium ativo na conta pessoal do dono.
2. No card do bot, clica **Atualizar webhook** (necessário 1x).
3. No `@BotFather`, ativa Business Mode no bot: `/mybots → bot → Bot Settings → Business Mode → Turn on`.
4. No app oficial do dono: Configurações → Telegram Business → Chatbots → digita `@username_do_bot` → habilita "Responder mensagens".
5. Card recarrega mostrando a conexão ativa.
6. Cliente (segunda conta) manda DM pro número pessoal do dono. Bot responde no chat aparentando ser o dono (no app do cliente não tem indicação "via bot").

## Commit

_TBD — atualizar com o hash quando a fase fechar._
