# Phase 7 — FAQs

**Status:** ✅ Concluída
**Objetivo:** Admin cadastra perguntas e respostas; pipeline injeta as ativas no system prompt e o LLM responde usando a base.

## O que foi feito

### Domínio

- [`lib/core/ports/config-repo.ts`](../lib/core/ports/config-repo.ts) — novo método `getActiveFaqs(tenantId)` + tipo `FaqItem`
- [`lib/db/repos/config-repo.ts`](../lib/db/repos/config-repo.ts) — implementação: `select * from faqs where tenant_id = ? and enabled = true order by created_at`
- [`lib/core/tone/prompt-builder.ts`](../lib/core/tone/prompt-builder.ts) — novo slot `faqs` no `SystemPromptOptions`. Quando há ≥1 FAQ, anexa bloco "Base de conhecimento:" enumerando perguntas e respostas, com instrução explícita pra usar a FAQ quando casar e responder naturalmente quando não.
- [`lib/core/pipeline.ts`](../lib/core/pipeline.ts) — propaga `faqs` do input pro prompt builder

### Webhook

- [`route.ts`](../app/api/channels/telegram/webhook/%5Bid%5D/route.ts) — `getActiveFaqs` carregado em paralelo com tone/llm/conversation, repassado ao pipeline

### Admin

- [`/faqs/page.tsx`](../app/%28admin%29/faqs/page.tsx) — lista as FAQs do tenant + form "Nova FAQ" sempre visível no topo
- [`/faqs/[id]/page.tsx`](../app/%28admin%29/faqs/%5Bid%5D/page.tsx) — página de edição usando o mesmo `FaqForm` em modo `edit`
- [`faq-form.tsx`](../app/%28admin%29/faqs/faq-form.tsx) — client component compartilhado entre create e edit (`mode: "create" | "edit"`)
- [`faq-list.tsx`](../app/%28admin%29/faqs/faq-list.tsx) — server component renderiza cards com badge de "desativada", chips das keywords, e botões Editar/Desativar/Excluir
- [`actions.ts`](../app/%28admin%29/faqs/actions.ts) — `createFaq`, `updateFaq`, `deleteFaq`, `toggleFaqEnabled`. Zod valida; keywords são parseadas por vírgula

### Testes

- 2 testes novos pro prompt builder cobrindo o bloco de FAQs presente/ausente. Total: **41 testes**.

## Decisões

- **Matcher é "tudo no system prompt"** — todas as FAQs ativas vão pro prompt e o LLM escolhe. Funciona bem até ~20-30 FAQs. Acima disso vale pré-filtrar (keyword ou embeddings) — virou pendência da Phase 9.
- **Keywords entram no schema mas não no matching ainda** — o campo já existe pra evolução futura. Por enquanto é só display nos chips do admin.
- **Sem nova intent `faq`** — o classifier de Phase 3 continua só com `saudacao` e `outro`. Detectar "isso é uma pergunta de FAQ" por regex é mais frágil que confiar no LLM com o prompt certo. Mantenho `saudacao` porque casa cedo (regex rápida) e gera resposta diferente quando o usuário só cumprimenta.
- **`/faqs/[id]` em vez de modal** — Server Action `updateFaq` faz `redirect("/faqs")` no sucesso. Modal complicaria UX state sem benefício.
- **Form único pra create+edit** — `mode: "create" | "edit"` escolhe qual action chamar. Reset automático só no create.
- **Cap de 4000 chars na resposta** — Zod limita pra não inflar o prompt acidentalmente.

## Como testar

1. `/faqs` no painel
2. Adicione: "Qual o horário?" / "De segunda a sexta, das 9h às 18h."
3. Mande "vocês atendem domingo?" pro bot
4. Resposta vem do LLM **citando o horário** das FAQs, ajustado ao tom
5. Desative a FAQ → a resposta volta a ser genérica/improvisada

## Pendências passadas adiante

- **Pré-filtro de FAQs** — quando passar de ~30 FAQs, o prompt fica caro. Phase 9 pode adicionar BM25/trigrama ou embeddings (extensão `vector` já tá disponível no Supabase).
- **Reorder/preview de FAQs** — UX nice-to-have, não bloqueia uso.
- **Importação em massa** (CSV) — admin tem que cadastrar uma por uma hoje. Phase tardia.

## Arquivos novos/modificados

```
app/(admin)/faqs/page.tsx                                 [novo]
app/(admin)/faqs/[id]/page.tsx                            [novo]
app/(admin)/faqs/faq-form.tsx                             [novo]
app/(admin)/faqs/faq-list.tsx                             [novo]
app/(admin)/faqs/actions.ts                               [novo]
app/api/channels/telegram/webhook/[id]/route.ts           [editado: carrega FAQs]
lib/core/ports/config-repo.ts                             [editado: getActiveFaqs + FaqItem]
lib/core/pipeline.ts                                      [editado: faqs no input]
lib/core/tone/prompt-builder.ts                           [editado: bloco de FAQs]
lib/core/tone/prompt-builder.test.ts                      [editado: 2 testes novos]
lib/db/repos/config-repo.ts                               [editado: query getActiveFaqs]
```

Sem migrations nessa fase — a tabela `faqs` existe desde Phase 1 com policies RLS prontas.

## Commit

A ser feito após este doc.
