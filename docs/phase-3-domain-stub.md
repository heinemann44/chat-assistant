# Phase 3 — Domínio agnóstico + LLM stub

**Status:** ✅ Concluída
**Objetivo:** Núcleo de domínio puro (sem Telegram, DB, ou LLM real) — pipeline classifica intent, monta system prompt com tom, e gera resposta via stub.

## O que foi feito

- **Ports** ([lib/core/ports/](../lib/core/ports/)) — `LLMProvider` e `ChannelAdapter` definidos no domínio. Implementações vivem fora (`lib/llm/`, `lib/channels/`)
- **Tipos compartilhados** ([lib/core/types.ts](../lib/core/types.ts)) — `IncomingMessage`, `OutgoingMessage`, `ConversationMessage`, `ConversationContext`, `Tone`, `Intent`, `ChannelType`
- **Classifier de intent** ([lib/core/intent/classifier.ts](../lib/core/intent/classifier.ts)) — regex pt-BR pra `saudacao` (oi/olá/bom dia/e aí/hello/etc), resto cai em `outro`
- **Builder de system prompt** ([lib/core/tone/prompt-builder.ts](../lib/core/tone/prompt-builder.ts)) — base fixa + preset (formal/casual/descontraido) ou `customInstructions`, com slots opcionais pra hint de intent e `systemExtras`
- **Pipeline** ([lib/core/pipeline.ts](../lib/core/pipeline.ts)) — orquestra: classifica → monta prompt com hint da intent → chama `LLMProvider` → devolve `replies`
- **StubProvider** ([lib/llm/stub.ts](../lib/llm/stub.ts)) — implementação determinística do `LLMProvider`. Detecta o tom no system prompt e responde adequadamente. Substituído por Anthropic/OpenAI na Phase 6
- **vitest configurado** ([vitest.config.ts](../vitest.config.ts)) com alias `@` apontando pra raiz
- **34 testes verdes** cobrindo classifier, prompt builder, pipeline (com FakeLLM), e stub end-to-end via pipeline

## Decisões

- **Ports vivem em `lib/core/`** (não em `lib/channels/` ou `lib/llm/`). Cumpre a regra do AGENTS.md à risca — domínio define o contrato, implementações dependem do domínio, não o contrário. Padrão hexagonal/ports-and-adapters.
- **Pipeline retorna `{ replies, intent }`, sem efeitos colaterais.** Quem chama (webhook na Phase 4) é responsável por entregar via `ChannelAdapter`. Pipeline fica puro e testável.
- **History é opcional no `PipelineInput`.** Phase 4 vai começar a popular com últimas N mensagens da `conversations` table. Phase 3 testa o threading via teste explícito.
- **Intent hint é injetado no system prompt** (não na mensagem do usuário). Mantém o histórico de conversa limpo e o LLM recebe a instrução como contexto.
- **Stub honra o tom** (detecta "tom formal", "tom descontra" no system prompt). Não é uma implementação séria, mas o round-trip de dev/teste fica significativo.
- **Tests co-localizados** (`*.test.ts` ao lado do arquivo) em vez de pasta `__tests__/` separada — mais discoverable, alinha com convenção comum do TS.

## Gotcha de regex

`\b` em JavaScript é **ASCII-only**. Isso significa que `\bolá\b` não casa "olá" porque o "á" final não conta como word char, e fim-de-string depois de não-word-char não é boundary. Solução: usar `(?![\p{L}])` com flag `u` em vez de `\b`. Custou 3 falhas de teste pra eu lembrar disso.

## Arquivos novos

```
vitest.config.ts
lib/core/types.ts
lib/core/ports/channel-adapter.ts
lib/core/ports/llm-provider.ts
lib/core/intent/classifier.ts
lib/core/intent/classifier.test.ts
lib/core/tone/prompt-builder.ts
lib/core/tone/prompt-builder.test.ts
lib/core/pipeline.ts
lib/core/pipeline.test.ts
lib/llm/stub.ts
lib/llm/stub.test.ts
```

## Pendências passadas adiante

- **Sem persistência ainda.** Pipeline recebe `tone` e `history` por parâmetro. Phase 4 vai criar `ConfigRepo` (lê `tone_config`, `llm_config`, `handoff_config`, FAQs) e `ConversationRepo` (lê/escreve `conversations`), também como ports em `lib/core/ports/`.
- **Sem detector de handoff** — Phase 8 adiciona uma nova intent (`handoff`) com regex de keywords + classificador via LLM.
- **Sem matcher de FAQ** — Phase 7 adiciona uma intent `faq` que dispara busca/match.
- **StubProvider permanece como fallback** quando `llm_config.provider = 'stub'` ou quando a API key real falha. Vale a pena: dev sem chave + circuit breaker grátis.

## Commit

A ser feito após este doc.
