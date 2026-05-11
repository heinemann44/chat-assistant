# Phase 8 — Handoff humano

**Status:** ✅ Concluída
**Objetivo:** Detectar quando o cliente pede atendimento humano, silenciar o bot na conversa, notificar o dono, expirar automaticamente após X minutos.

## O que foi feito

### Domínio

- [`lib/core/handoff/detector.ts`](../lib/core/handoff/detector.ts) — keyword-based `detectHandoffIntent(text, keywords)`. Substring case-insensitive, configurável por tenant.
- [`lib/core/handoff/messages.ts`](../lib/core/handoff/messages.ts) — `HANDOFF_USER_ACK` (resposta pro cliente) + `buildOwnerNotification(...)` (mensagem ao dono, com últimas 6 trocas).
- [`lib/core/handoff/notifier.ts`](../lib/core/handoff/notifier.ts) — `dispatchHandoffNotification` roteia por `notify_channel`: telegram (reusa `ChannelAdapter.notifyOwner`) ou webhook (POST JSON). Email retorna `{ok:false}` por enquanto.

### Ports + Repos

- [`ConversationRepo`](../lib/core/ports/conversation-repo.ts) ganhou `startHandoff` e `resumeIfExpired`. O segundo é atômico (`UPDATE ... WHERE state='handoff_active' AND handoff_until <= now() RETURNING id`) e fecha o event aberto se a conversa transitou.
- [`HandoffEventsRepo`](../lib/core/ports/handoff-events-repo.ts) + [implementação Drizzle](../lib/db/repos/handoff-events-repo.ts) — INSERT simples retornando o id.

### Webhook

[`route.ts`](../app/api/channels/telegram/webhook/%5Bid%5D/route.ts) ganhou state-machine de handoff:

1. **Lazy auto-resume** — se `state = handoff_active` e `handoff_until <= now()`, `resumeIfExpired` flipa pra `active` antes de seguir.
2. **Mute** — se ainda em handoff ativo (não expirou), só anexa a mensagem do usuário em `last_messages` e devolve 200 sem chamar LLM.
3. **Trigger** — `detectHandoffIntent` testa keywords; se casar:
   - `startHandoff` marca `state='handoff_active'`, `handoff_until = now() + auto_resume_minutes`
   - `record` insere em `handoff_events`
   - `dispatchHandoffNotification` envia pro canal configurado
   - Bot responde `HANDOFF_USER_ACK` ao cliente
   - Anexa user + ack na conversa
4. **Pipeline normal** caso contrário (path já existente).

### Cron

Migration `enable_pg_cron_and_expire_handoffs`:
- `CREATE EXTENSION IF NOT EXISTS pg_cron` (free tier do Supabase libera)
- Função `public.expire_handoffs()` faz update em batch (resolve eventos abertos + flipa estado)
- `cron.schedule('expire-handoffs', '* * * * *', ...)` — todo minuto

Confirmei o job está agendado: `SELECT * FROM cron.job WHERE jobname='expire-handoffs'` → `active = true`.

### Admin `/handoff`

- [`page.tsx`](../app/%28admin%29/handoff/page.tsx) — carrega `handoff_config` + conversas em estado `handoff_active`
- [`handoff-form.tsx`](../app/%28admin%29/handoff/handoff-form.tsx) — 2 cards de canal (telegram/webhook; email omitido), `notify_target`, `auto_resume_minutes` (1-1440), `trigger_keywords` (separadas por vírgula)
- [`active-handoffs.tsx`](../app/%28admin%29/handoff/active-handoffs.tsx) — lista handoffs ativos com botão "Resolver" (form action → marca evento como resolvido por mim, flipa estado)
- [`actions.ts`](../app/%28admin%29/handoff/actions.ts) — `updateHandoffConfig` e `resolveHandoff` via Supabase JS (RLS scoped)

### Testes

- [`detector.test.ts`](../lib/core/handoff/detector.test.ts) — match positivo/negativo + keyword vazia
- [`notifier.test.ts`](../lib/core/handoff/notifier.test.ts) — telegram via adapter fake, webhook via fetch mockado, falhas 5xx, target ausente

**56 testes** no total (15 novos nessa fase).

## Decisões

- **Detecção 100% keyword, sem classificador LLM.** Mais barato, determinístico, configurável. Admin tunaá a lista por tenant. Se quiser pegar pedidos sutis tipo "vocês têm alguém pra conversar?" no futuro, vira uma chamada LLM extra atrás de feature-flag.
- **Lazy expire + cron** — o cron garante o resume mesmo sem mensagem nova; a checagem no webhook cobre o gap entre execuções (cron roda a cada minuto, mas mensagem pode chegar 30s depois do expire).
- **Email omitido do form** — tabela permite `'email'` no enum, mas a UI mostra só telegram/webhook. Quando o projeto sair do free e tiver SMTP, é flag pra reativar a opção.
- **Ack determinística pro cliente** — `HANDOFF_USER_ACK` é uma string fixa em vez de gerada pelo LLM. Quando o bot está chamando humano não vale gastar token nem arriscar tom errado no momento crítico.
- **`resolveHandoff` registra `resolved_by`** com `auth.uid()` — auditoria útil quando virar multi-admin.
- **Notificação ao dono inclui últimas 6 trocas** — contexto suficiente pra entrar na conversa sem ler todo o histórico.

## Como testar

1. `/handoff` no painel → canal "Telegram" → cole seu chat_id (descubra com `@userinfobot`) → Salvar
2. (Opcional) Edite as palavras-gatilho. Default: `atendente, humano, pessoa, falar com`
3. Mande "preciso falar com atendente" pro bot
4. Você (dono) recebe DM com contexto + cliente recebe a ack
5. Cliente manda nova mensagem → bot fica em silêncio (log: `muted: handoff active`)
6. Espere `auto_resume_minutes` (ou clique "Resolver" no `/handoff`) → próxima mensagem do cliente é processada normalmente

Pra testar o cron: insere uma conversa em handoff com `handoff_until` no passado e aguarda o minuto cheio. Job roda automaticamente.

## Pendências passadas adiante

- **Classificador LLM secundário** — quando keyword falha mas a mensagem clearly pede humano. Opcional, deixaria a detecção mais "smart" às custas de latência+custo.
- **Sem resposta proativa quando o cron resume** — cliente pode ficar sem saber que o bot voltou. Phase 9 (polish) pode mandar "Voltei ao atendimento automático, ainda precisa de ajuda?".
- **Sem rate-limit de re-handoff** — cliente pode disparar handoff de novo logo depois de resolver. Tudo bem pra MVP; vira tema de polish.
- **`auth_leaked_password_protection` continua desligado** — recomendo ligar em Authentication → Providers → Email no dashboard quando puder.

## Migrations aplicadas

- `enable_pg_cron_and_expire_handoffs`

Advisor: 3 warnings esperados (RPCs SECURITY DEFINER intencionais) + 1 setting de dashboard. Sem regressões.

## Commit

A ser feito após este doc.
