<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chat Assistant — convenções do projeto

## Documentar cada fase em `/docs`

**Toda fase de implementação ganha um arquivo `docs/phase-N-slug.md`** com este formato:

- **Status** (✅/⏳/⚠️) e **objetivo** em uma linha
- **O que foi feito** — bullets curtos, com links pros arquivos relevantes
- **Decisões** — escolhas não-óbvias e o porquê
- **Pendências passadas adiante** — o que ficou pra próxima fase saber
- **Commit** — hash do commit que fechou a fase

Atualize também o índice em [`docs/README.md`](docs/README.md) ao concluir cada fase. Use linguagem direta, sem floreio — é changelog, não marketing.

## Arquitetura

> Single-tenant no produto hoje; multi-tenant no schema e nas abstrações.

- **`lib/core/` é puro domínio.** Não pode importar de `lib/channels/`, `lib/llm/`, `lib/db/`, ou `lib/supabase/`. Recebe dependências via interfaces (`ChannelAdapter`, `LLMProvider`, repos). É o que permite plugar WhatsApp/Slack ou trocar Claude/OpenAI sem refactor.
- **Toda configuração relevante mora no banco**, não em env vars. Tom, FAQs, provider de LLM, contato de handoff, tokens de canal — tudo editável pelo painel admin.
- **Toda tabela carrega `tenant_id`** mesmo no MVP. Quando virar multi-tenant, só vai faltar a UI de signup — zero migração de dados.
- **Segredos no Supabase Vault.** Bot tokens e API keys ficam em `vault.secrets`, referenciados por UUID nas tabelas. Nunca em coluna texto.

## Layout de pastas

```
app/
├── (admin)/            rotas protegidas, layout compartilhado
├── api/                webhooks, cron
├── login/              público
└── page.tsx            redireciona pra /dashboard
lib/
├── core/               domínio agnóstico
├── channels/           ChannelAdapter + implementações
├── llm/                LLMProvider + factory + implementações
├── db/                 Drizzle schema + client
├── supabase/           clients de auth (server, browser, proxy)
└── tenant/             helpers de contexto de tenant
docs/                   changelog por fase
drizzle/                migrations (geradas; source-of-truth fica no Supabase)
proxy.ts                raiz — auth gate + session refresh
```

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript estrito + Tailwind v4
- **Vercel** hosting
- **Supabase** Postgres + Auth + Vault — migrations aplicadas via MCP (`apply_migration`)
- **Drizzle ORM** pra queries type-safe — schema em `lib/db/schema.ts` espelha o banco manualmente
- **grammy** SDK Telegram (apenas webhook, nunca polling em prod)
- **zod** validação de input em forms e payloads
- **pino** logs estruturados
- **vitest** testes unitários

## Banco de dados

- **Migrations via Supabase MCP** (`mcp__supabase__apply_migration`), não via `drizzle-kit migrate`. Drizzle é só pra tipos no app code.
- **Manter `lib/db/schema.ts` em sync** com cada migration aplicada — sync é manual, revisado nos commits.
- **RLS obrigatório** em todas as tabelas. Policies escopadas por `public.current_tenant_id()` pra `authenticated`. Service role bypassa.
- **`SECURITY DEFINER` só quando estritamente necessário** (ex.: trigger em `auth.users`). Sempre com `SET search_path = public` e `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` se for callable via PostgREST.
- **`SET search_path = public` em toda função `plpgsql`** — proteção contra hijack.
- **`updated_at` automático** via trigger `set_updated_at()` BEFORE UPDATE.
- **Rodar `get_advisors` (`security` e `performance`)** depois de cada migration. Zero lints antes de commitar.

## Auth

- **Server-side** (Server Components, Server Actions, Route Handlers): `createSupabaseServerClient()` de `lib/supabase/server.ts`
- **Browser**: `createSupabaseBrowserClient()` de `lib/supabase/browser.ts` (raro)
- **Proxy**: `lib/supabase/proxy.ts` exporta `updateSession`; `proxy.ts` na raiz invoca
- **Rotas públicas**: só `/login` e `/api/*` (webhooks têm seu próprio mecanismo de verificação)
- **Defense-in-depth**: o proxy redireciona, mas `(admin)/layout.tsx` re-checa `supabase.auth.getUser()` no servidor

## Next 16 — diferenças que mordem

- `middleware.ts` foi renomeado pra **`proxy.ts`**; função exportada chama `proxy` (não `middleware`)
- `cookies()` é **async** — sempre `const cookieStore = await cookies()`
- Route groups `(nome)` não aparecem na URL — `app/(admin)/dashboard/page.tsx` → `/dashboard`
- Antes de usar API nova, confira em `node_modules/next/dist/docs/`

## Estilo de código

- **Sem comentários** a menos que o "porquê" não seja óbvio (invariante escondido, workaround específico, comportamento que surpreenderia o leitor). Não comentar o "o quê".
- **TypeScript estrito.** Sem `any`. Use `unknown` + narrowing quando o tipo for de fato dinâmico.
- **Validação no boundary.** Inputs externos (forms, webhooks, APIs) passam por zod antes de tocar lógica interna.
- **Server Actions pra mutações**, não Route Handlers (exceto webhooks e cron).
- **`useActionState` (React 19)** pra forms — sem state local nem `useFormState` deprecated.
- **Sem feature flags ou shims de compat** — mexa direto no código quando precisar mudar.
- **Sem error handling defensivo redundante.** Confie em código interno e nas garantias do framework. Valida só nas bordas.

## Workflow

- **`npm run build`** antes de commitar — TypeScript falha o build, vai pegar erros de tipo
- **`npm test`** pra suites de unit (vitest), quando aplicável
- **Commit por fase ou unidade lógica**, mensagem explicando o porquê (não só o quê)
- **Sem co-author tag** automático de IA nos commits
- **Sem `--no-verify`** ou bypass de hooks; se hook quebra, conserta a causa
