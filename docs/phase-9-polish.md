# Phase 9 — Polish + produção

**Status:** ✅ Concluída
**Objetivo:** Rate-limit pra proteger LLM custoso de spam, README decente, fechar o MVP.

## O que foi feito

### Rate-limit

- [`lib/core/rate-limit/limiter.ts`](../lib/core/rate-limit/limiter.ts) — 3 funções puras:
  - `isBursting(timestamps, incomingAt)`: 5 mensagens de usuário em 10s ativam o burst
  - `shouldRateLimit(history, incomingAt)`: adapter conveniente sobre `recentMessages`
  - `lastReplyWasRateLimitWarning(history)`: pra evitar repetir o aviso
- Constante: `RATE_LIMIT_WARNING` = "Você está enviando mensagens muito rápido…"
- [`route.ts`](../app/api/channels/telegram/webhook/%5Bid%5D/route.ts) — checagem **depois** do handoff (pra não bloquear pedido de humano em momento de pressa). Quando dispara:
  - Se a última resposta JÁ foi o warning → silencia (só anexa a msg do user, não responde)
  - Caso contrário → envia o warning, anexa user + warning na history
  - Em ambos os casos: nada de chamada LLM, retorna 200
- 9 testes vitest cobrindo: cadência normal, burst exato, fronteira do window, contagem ignorando assistant, supressão de warning repetido

### README

- [`README.md`](../README.md) — reescrito do zero. Cobre: stack, arquitetura, setup local passo-a-passo (incluindo ngrok), env vars com o "onde achar" no Supabase, comandos npm, deploy Vercel
- Aponta pra `docs/` pro changelog por fase e `AGENTS.md` pras convenções

## Decisões

- **Burst de 5 em 10s** — número conservador. Pega ataque/bot mas não trava digitação humana real (uma pessoa típica não manda 5 mensagens em 10s).
- **Warning único por burst** — checa `lastReplyWasRateLimitWarning`. Não polui o chat com avisos repetidos; cliente para de ouvir nada e entende que tá rápido demais.
- **Limite por (channel_instance, external_user)** — implícito pelo `recentMessages` da conversa. Não precisa tabela nova nem Redis. Custa zero, vive na window de 20 que já mantemos.
- **Handoff > rate-limit** — ordem de checagem no webhook. Cliente em pânico que dispara handoff não fica bloqueado pelo limite. Foi escolha consciente.
- **Não usei Upstash/Redis** — projeto inteiro deve rodar no free tier do Supabase + Vercel. Adicionar serviço externo só pra rate-limit é overkill.

## Testes

**65 testes** ao total (9 novos pra rate-limit). Build limpo, sem regressões.

## Pendências passadas adiante (e não-implementadas conscientemente)

- **Retry com backoff em erro transitório do LLM** (mencionado em Phase 6) — Telegram já reenvia em alguns casos; pra MVP a apologia genérica é suficiente.
- **Resposta proativa quando o cron resume o handoff** (mencionado em Phase 8) — bot poderia mandar "voltei, ainda precisa de ajuda?". Decidi não fazer pra não ressuscitar conversas mortas.
- **Pré-filtro de FAQs com BM25/embeddings** (mencionado em Phase 7) — só vira problema acima de ~30 FAQs.
- **Dropdown de modelos no `/llm`** (mencionado em Phase 6) — input livre é mais flexível, lista fica desatualizada rápido.
- **Observabilidade externa** — pino imprime JSON e Vercel/Supabase têm logs próprios. Dashboards específicos viram tema quando virar produto.
- **Multi-tenant signup** — schema já está pronto. Só falta UI, billing e isolamento de Auth. Não cabe no escopo do MVP.
- **`auth_leaked_password_protection`** — setting de dashboard do Supabase. Liga em Authentication → Providers → Email quando puder.

## Estado final do projeto

| | |
|---|---|
| Rotas | 11 (admin: dashboard, channels, tone, llm, faqs, faqs/[id], handoff + login + webhook + root) |
| Testes | 65 vitest |
| Migrations Supabase | 9 (todas aplicadas, advisor com 3 warnings esperados + 1 setting) |
| LLM providers | Stub, Anthropic, OpenAI, Z.AI (paas + coding) |
| Canais | Telegram (interface `ChannelAdapter` pronta pra WhatsApp/Slack/Discord) |

## Commit

A ser feito após este doc.
