# Phase 2 — Auth Supabase + shell do painel

**Status:** ✅ Concluída
**Objetivo:** Login com e-mail + senha, proteção de rotas, shell do painel admin.

## O que foi feito

- **Clients Supabase** ([lib/supabase/server.ts](../lib/supabase/server.ts), [browser.ts](../lib/supabase/browser.ts), [proxy.ts](../lib/supabase/proxy.ts)) seguindo o padrão canônico do `@supabase/ssr`
- **`proxy.ts` na raiz** (Next 16 renomeou `middleware` → `proxy`) — refresca a sessão em cada request, redireciona não-autenticados pra `/login` e autenticados que tentam `/login` pra `/dashboard`
- **Página de login** ([app/login/page.tsx](../app/login/page.tsx) + [login-form.tsx](../app/login/login-form.tsx)) — server component renderiza o shell, client component faz `useActionState` no form
- **Server actions** ([app/login/actions.ts](../app/login/actions.ts)) — `signIn` valida com zod e chama `signInWithPassword`, `signOut` encerra a sessão
- **Route group `(admin)`** ([app/(admin)/layout.tsx](../app/%28admin%29/layout.tsx)) — chrome compartilhada com nav, e-mail do usuário, botão de logout; faz double-check de auth no servidor (defense-in-depth contra config errada do proxy)
- **Dashboard placeholder** ([app/(admin)/dashboard/page.tsx](../app/%28admin%29/dashboard/page.tsx)) — lê o tenant via RLS (`current_tenant_id()`) e mostra nome/ID/data
- **`app/page.tsx`** agora redireciona pra `/dashboard` (proxy decide o resto)
- **Build limpo**: 4 rotas + proxy registrados ✓

## Decisões

- **Email + senha** em vez de magic link — plano free do Supabase não cobre envio de e-mail, então magic link não funcionaria
- **Sem página de signup pública** — single-tenant MVP. Você cria seu admin uma vez pelo dashboard do Supabase (Authentication → Users → Add user). O trigger `on_auth_user_created` da Phase 1 auto-liga ao tenant default
- **Defense-in-depth** — `proxy.ts` faz o redirect rápido, mas `(admin)/layout.tsx` re-valida no servidor. Se um dia o proxy for desativado por engano, as páginas continuam protegidas
- **Route group `(admin)`** — `(admin)/dashboard/page.tsx` resolve em `/dashboard` (parênteses não entram na URL); permite compartilhar layout sem prefixo
- **`useActionState`** (React 19) pro form — sem state local, sem `useFormState` deprecated

## Diferenças do Next 16 que mordi

- `middleware.ts` → **`proxy.ts`** na raiz, função exportada chama `proxy`
- `cookies()` é **async**: `const cookieStore = await cookies()`
- Resto da API (matchers, NextResponse, NextRequest) inalterada

## O que você precisa fazer pra testar localmente

1. **Copiar env**: `cp .env.example .env.local` (já vem com URL + anon key reais — basta isso pra Phase 2)
2. **Criar seu admin** no Supabase dashboard:
   - Authentication → Users → "Add user" → "Create new user"
   - E-mail + senha → criar
   - O trigger `on_auth_user_created` linka automaticamente ao tenant default
3. **`npm run dev`** e abra http://localhost:3000 — deve redirecionar pra `/login`
4. Logar com o e-mail/senha que você criou → cai em `/dashboard` mostrando o tenant

## Arquivos novos

```
app/(admin)/layout.tsx
app/(admin)/dashboard/page.tsx
app/login/page.tsx
app/login/login-form.tsx
app/login/actions.ts
app/page.tsx                  (substituído: redirect pra /dashboard)
lib/supabase/server.ts
lib/supabase/browser.ts
lib/supabase/proxy.ts
proxy.ts                      (raiz)
```

## Pendências passadas adiante

- **`.env.local` não criado** — é gitignored, você cria local. Phase 2 só precisa das duas vars `NEXT_PUBLIC_*` que já estão em `.env.example`
- **Sem reset de senha** — se você esquecer, recria pelo dashboard do Supabase
- **Service role key** ainda não usada — virá na Phase 4 (webhook precisa bypassar RLS pra escrever em `conversations` sem usuário logado)
