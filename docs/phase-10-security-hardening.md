# Phase 10 — Security hardening

✅ Endereçar achados acionáveis do `docs/security-review.md` sem quebrar fluxos existentes.

## O que foi feito

### Bugs e UX

- **#16** (bug): `enabled || true` removido em `createFaq` ([app/(admin)/faqs/actions.ts](../app/(admin)/faqs/actions.ts)) — checkbox desmarcada agora cria FAQ desativada de verdade.
- **#8** (info disclosure): `/llm` action passou a retornar `"Falha ao salvar"` em vez do `error.message` cru do Postgres ([app/(admin)/llm/actions.ts](../app/(admin)/llm/actions.ts)).
- **#15** (validação): `notifyTarget` passou a ter zod `superRefine` condicional — exige `https://` URL parseável quando `notifyChannel="webhook"` e string numérica para `"telegram"` ([app/(admin)/handoff/actions.ts](../app/(admin)/handoff/actions.ts)).

### Bordas (input hardening)

- **#7**: `parseTelegramUpdate` trunca o texto do usuário em **2000 chars** antes de devolver ao pipeline ([lib/channels/telegram/parse.ts](../lib/channels/telegram/parse.ts)). Contém cost-burn e reduz superfície de prompt injection.

### Logs

- **#4**: `call()` em [lib/channels/telegram/api.ts](../lib/channels/telegram/api.ts) envelopa o `fetch` em try/catch e relança como `TelegramApiError(method, "network error")` — o stack do fetch nativo carregava a URL completa (com bot token) em erros de rede.
- **#13**: pino com `redact` configurado pra mascarar `bot_token`, `botToken`, `apiKey`, `api_key`, `password`, `authorization`, `cookie` ([lib/logger.ts](../lib/logger.ts)).

### SSRF

- **#3**: `dispatchHandoffNotification` em [lib/core/handoff/notifier.ts](../lib/core/handoff/notifier.ts) ganhou um `guardWebhookUrl` que:
  - rejeita URL inválida ou que não seja `https://`;
  - faz `dns.lookup({ all: true })` do hostname;
  - bloqueia IPs privados (10/8, 172.16-31, 192.168/16), loopback (127/8, ::1), link-local (169.254/16, fe80::, incl. IMDS), CGNAT (100.64/10), multicast e ULA;
  - aplica `AbortController` com timeout de 5 s no fetch.
- Cobertura: 4 testes novos em [lib/core/handoff/notifier.test.ts](../lib/core/handoff/notifier.test.ts) (resolve público OK, http:// bloqueado, IMDS bloqueado por DNS, loopback literal bloqueado).

### Auth defense-in-depth

- **#10**: `requireUser()` + `UnauthorizedError` adicionados em [lib/supabase/server.ts](../lib/supabase/server.ts). Todas as actions de `app/(admin)/*` chamam o helper no topo — formulários retornam `"Sessão expirada"`; actions void deixam lançar (proxy redireciona antes na prática).
- **#14**: proxy em [lib/supabase/proxy.ts](../lib/supabase/proxy.ts) trocou o early-return `/api/*` por uma allowlist explícita (`PUBLIC_API_PREFIXES = ["/api/channels/"]`). Qualquer rota `/api/*` nova que não estiver na lista passa pelo gate de auth.

### Banco

- **#6**: migration `revoke_dml_on_admin_users_and_tenants` revoga `INSERT/UPDATE/DELETE` em `public.admin_users` e `public.tenants` das roles `anon` e `authenticated`. Defense-in-depth contra policy frouxa futura — essas tabelas só devem ser mutadas por trigger `SECURITY DEFINER` ou `service_role`.

## Itens conscientemente fora de escopo

- **#1** (signup público vira owner) — toggle de dashboard. Decisão do usuário: desabilitar manual em **Authentication → Providers → Email → "Enable Signup" = off** no projeto Supabase. Código do trigger fica como está.
- **#2** (senha do Postgres em `.env.local`) — exige rotação manual em **Settings → Database → Reset database password** + atualização do `.env.local` e env vars na Vercel.
  - Sub-item da porta do `DIRECT_DATABASE_URL` (6543 vs 5432) foi descartado: no fluxo atual nada em runtime usa essa URL e migrations rodam via Supabase MCP. Só morderia em `drizzle-kit push`/`studio`/`migrate`, que não fazem parte do workflow.
- **#5** (cost-burn DoS no LLM) — follow-up de fase própria. Requer schema novo (`tenant_usage`), kill switch automático e UI. Mitigação parcial já entrou via #7 (truncamento de input).
- **#9** (leaked password protection) — toggle de dashboard em **Authentication → Policies**.
- **#11** (3 RPCs SECURITY DEFINER executáveis por `authenticated`) — aceito como exceção por design (`AGENTS.md`). Documentado.
- **#12** (timing leak no `secretsEqual`) — não exploitable (formato do secret é público); ignorado.
- **#17** (trigger usa "primeiro tenant") — endereçar quando o produto for multi-tenant.

## Decisões

- **Allowlist no proxy em vez de revisar caso a caso.** Custo zero, fail-closed para rotas `/api/*` futuras. Sem essa mudança, qualquer rota `/api/admin/algo` nova fica aberta por esquecimento.
- **SSRF guard fica em `lib/core/` mesmo importando `node:dns`.** O `notifier.ts` já fazia `fetch`, então a pureza do core já estava quebrada nesse caminho específico. Mantém a regra de não importar dos `lib/*` do projeto, que é o que `AGENTS.md` cobra.
- **REVOKE só em `admin_users` e `tenants`.** Conservador: nenhuma action atual mexe nessas tabelas via PostgREST, então é zero-risco. Estender a `conversations`/`handoff_events` exigiria refatorar `resolveHandoff` em RPC — adiado por não ter ganho marginal no MVP.

## Pendências passadas adiante

- Ações **fora do código** que o usuário precisa tomar antes/durante o próximo deploy:
  1. Desabilitar signup público no dashboard Supabase (#1).
  2. Rotacionar a senha do Postgres + atualizar `.env.local` e env vars da Vercel (#2).
  3. Habilitar "Leaked Password Protection" (#9).
- **Fase futura**: cap de custo do LLM por tenant (#5) — quando virar multi-tenant essa fica obrigatória.

## Commit

`b2dc9cf` — Phase 10: security hardening from review
