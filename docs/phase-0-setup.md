# Phase 0 — Setup do projeto

**Status:** ✅ Concluída
**Objetivo:** Scaffold deployável + dependências + estrutura mínima para as próximas fases.

## O que foi feito

- **Scaffold Next.js 16.2.6** com `create-next-app`: TypeScript, Tailwind v4, ESLint, App Router, sem `src/`, alias `@/*`, Turbopack
- **Deps de runtime**: `drizzle-orm`, `postgres`, `@supabase/ssr`, `@supabase/supabase-js`, `grammy`, `zod`, `pino`
- **Deps de dev**: `drizzle-kit`, `vitest`, `tsx`, `dotenv`, `pino-pretty`
- **Drizzle configurado** ([drizzle.config.ts](../drizzle.config.ts)) — carrega `.env.local`, schema em [lib/db/schema.ts](../lib/db/schema.ts)
- **DB client** ([lib/db/client.ts](../lib/db/client.ts)) — `postgres-js` com `prepare: false` (exigido pelo Supabase transaction pooler) e cache global pra sobreviver hot reload e cold starts serverless
- **Scripts npm**: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `test`
- **`.env.example`** documentando Supabase URL/keys, `DATABASE_URL` (pooler) e `DIRECT_DATABASE_URL` (direto, pra migrations)
- **`.gitignore`** com exceção `!.env.example`
- **Build limpo**: `npm run build` ✓

## Decisões

- **`postgres-js` no lugar de `pg`** — mais leve, performance melhor com o pooler do Supabase. `prepare: false` é obrigatório porque o pooler do Supabase (modo transaction) não suporta prepared statements.
- **Cache global do cliente Postgres** — necessário em serverless (Vercel) pra reusar conexão entre invocações do mesmo container.
- **Não usar `src/`** — `app/` e `lib/` ficam na raiz, alinhado à convenção mais comum do App Router.
- **`pino-pretty` como devDep** — pino raw é JSON; pretty só pra terminal local.

## Arquivos criados/modificados

```
.env.example
.gitignore
drizzle.config.ts
lib/db/client.ts
lib/db/schema.ts        (placeholder até Phase 1)
package.json            (scripts + deps)
```

## Pendências passadas adiante

- **Next 16** (mais recente do que o esperado) — verificar `node_modules/next/dist/docs/` antes de usar APIs específicas (rotas dinâmicas, middleware) nas próximas fases.
- **Node engine warning** — `eslint-visitor-keys@5` quer Node ≥22.13, máquina tem 22.12. Não bloqueia.

## Commit

`b1d6278` — Phase 0: project setup with Drizzle + Supabase deps
