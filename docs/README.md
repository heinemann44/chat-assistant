# Changelog por fase

Cada fase do projeto tem um arquivo aqui, resumindo o que foi feito, por que, e o que ficou pendente. Lê na ordem.

| Fase | Status | Resumo |
|------|--------|--------|
| [Phase 0](./phase-0-setup.md) | ✅ | Setup do projeto Next.js + deps + Drizzle/Supabase config |
| [Phase 1](./phase-1-schema.md) | ✅ | Schema do banco (9 tabelas), RLS, seed do tenant default |
| [Phase 2](./phase-2-auth.md) | ✅ | Auth Supabase (email+senha), proxy de proteção, shell do painel |
| [Phase 3](./phase-3-domain-stub.md) | ✅ | Domínio agnóstico (ports + pipeline + intent + tom) + LLM stub + 34 testes |
| [Phase 4](./phase-4-telegram-webhook.md) | ✅ | Canal Telegram (webhook), repos Drizzle, página `/channels`, vault dos tokens |
| [Phase 5](./phase-5-tone.md) | ✅ | Página `/tone` com presets + custom, validada com zod |
| [Phase 6](./phase-6-llm-real.md) | ✅ | LLM real (Claude/OpenAI/Z.AI), vault pra API key, `/llm` no admin |
| [Phase 7](./phase-7-faqs.md) | ✅ | FAQs CRUD + injeção no system prompt |
| [Phase 8](./phase-8-handoff.md) | ✅ | Handoff humano (detector, notifier, pg_cron expirando) |
| [Phase 9](./phase-9-polish.md) | ✅ | Rate-limit por burst + README completo |
| [Phase 10](./phase-10-security-hardening.md) | ✅ | Hardening (SSRF guard, redact, REVOKE DML, requireUser, allowlist proxy) |

## Stack final

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind
- **Vercel** (hosting)
- **Supabase** Postgres + Auth + Vault
- **Drizzle ORM** (queries type-safe; migrations aplicadas via Supabase MCP)
- **grammy** (SDK Telegram)
- **zod** (validação), **pino** (logs), **vitest** (testes)

## Princípio de arquitetura

> Single-tenant no produto hoje; schema e abstrações já multi-tenant + multi-canal.

`lib/core/` é puro TypeScript de domínio: não importa de `lib/channels/`, `lib/llm/`, ou `lib/db/`. Recebe tudo via interfaces (`ChannelAdapter`, `LLMProvider`). É o que permite plugar WhatsApp/Slack e trocar Claude/OpenAI sem refactor.
