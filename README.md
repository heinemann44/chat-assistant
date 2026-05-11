# Chat Assistant

Assistente de IA pra atendimento via Telegram (e, no futuro, WhatsApp/Slack/Discord). O dono configura tudo pelo painel — tom da resposta, FAQs, provider de LLM, canal de notificação pra handoff humano. Bot responde sozinho até o cliente pedir uma pessoa, então silencia e avisa o dono.

Single-tenant em produção hoje; o schema e as abstrações já estão prontos pra virar multi-tenant sem reescrita.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript estrito + Tailwind v4
- **Vercel** (hosting)
- **Supabase** Postgres + Auth + Vault (segredos como bot token e API key da LLM)
- **Drizzle ORM** pra queries no servidor; migrations aplicadas via Supabase MCP
- **grammy não, fetch direto** pro Telegram Bot API
- **Providers de LLM**: Claude (Anthropic), GPT (OpenAI), GLM (Z.AI paas ou Coding Plan), stub determinístico
- **zod** validação, **pino** logs, **vitest** testes

## Arquitetura

> `lib/core/` é puro domínio. Recebe `ChannelAdapter`, `LLMProvider`, repos via interfaces. É o que permite plugar WhatsApp ou trocar o LLM sem refactor.

```
app/
├── (admin)/            rotas protegidas (dashboard, channels, tone, llm, faqs, handoff)
├── api/                webhooks
└── login/              público
lib/
├── core/               domínio agnóstico (pipeline, intent, tom, handoff, rate-limit, ports)
├── channels/           ChannelAdapter + implementação Telegram
├── llm/                LLMProvider + factory + stub/anthropic/openai/zai
├── db/                 Drizzle schema + client + repos + vault helper
└── supabase/           clients de auth (server, browser, proxy)
docs/                   changelog por fase, leia em ordem
drizzle/                migrations geradas (source-of-truth fica no Supabase)
proxy.ts                auth gate + session refresh
```

## Setup local

### 1. Pré-requisitos

- Node.js 22.13+ (Node 22.12 gera warnings inofensivos de engine)
- Conta Supabase com projeto criado
- Bot Telegram (criar com `@BotFather`)
- `ngrok` ou `cloudflared` pra expor localhost (Telegram exige HTTPS pública pro webhook)

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preenche em `.env.local`:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (opcional, não usado hoje) |
| `DATABASE_URL` | Supabase → Settings → Database → **Transaction pooler** (port 6543) |
| `DIRECT_DATABASE_URL` | Supabase → Settings → Database → **Direct connection** (port 5432) |
| `APP_URL` | URL pública do app (ngrok em dev, vercel.app em prod) |

Roda `npm run db:check` pra validar as URLs do Postgres — ele detecta os erros comuns (porta errada, falta o `.PROJECT_REF` no usuário, etc.).

### 3. Banco

O schema já está aplicado no Supabase (vide `docs/phase-1-schema.md`). Pra um projeto novo do zero, reaplica as migrations em ordem via Supabase MCP ou copia-cola do SQL Editor.

### 4. Primeiro admin

Authentication → Users → "Add user" no dashboard do Supabase. O trigger `on_auth_user_created` linka o user ao tenant default automaticamente.

### 5. Rodando

```bash
npm install
npm run dev            # localhost:3000
ngrok http 3000        # noutro terminal
```

Atualize `APP_URL` no `.env.local` com a URL do ngrok e reinicie o `npm run dev`.

### 6. Conectar o bot

1. Abra http://localhost:3000 → faz login
2. `/channels` → "Conectar" → nome + bot token do BotFather
3. O app valida via `getMe`, salva o token no Supabase Vault e registra o webhook no Telegram apontando pra `APP_URL/api/channels/telegram/webhook/[uuid]`
4. Manda "oi" pro seu bot → resposta vem do stub determinístico

### 7. Plugar LLM real

`/llm` → escolhe provider → cola a API key → Salvar. Próxima mensagem usa o provider real.

## Comandos

| Comando | Função |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build de produção. Falha o build em erro de TypeScript |
| `npm test` | Vitest |
| `npm run db:check` | Diagnostica DATABASE_URL/DIRECT_DATABASE_URL (sanity check de conexão) |
| `npm run db:generate` | drizzle-kit generate (gera SQL a partir do schema TS) |
| `npm run db:push` | drizzle-kit push (não usado em produção; preferir Supabase MCP) |
| `npm run db:studio` | drizzle-kit studio (UI pra explorar o banco) |

## Deploy (Vercel)

1. **Push** o repo pro GitHub
2. No Vercel → "Add New Project" → seleciona o repo → "Deploy"
3. **Environment Variables** no Vercel: cole as mesmas do `.env.local`, exceto `APP_URL` (use a URL final, ex.: `https://chat-assistant.vercel.app`)
4. Promove o deploy
5. Volte ao `/channels` no app de prod → recrie o canal (ou re-registre o webhook chamando `setWebhook` com a URL nova)

## Documentação

[`docs/`](./docs/) tem um changelog por fase — decisões, gotchas e pendências. Comece pelo [índice](./docs/README.md).

Convenções de arquitetura e dev workflow ficam em [`AGENTS.md`](./AGENTS.md).
