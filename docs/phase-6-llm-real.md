# Phase 6 — LLM real configurável

**Status:** ✅ Concluída
**Objetivo:** Substituir o stub por Claude / GPT, com seleção de provider, modelo e parâmetros pelo painel. API key vai pro Supabase Vault.

## O que foi feito

### Providers reais

- [`lib/llm/anthropic.ts`](../lib/llm/anthropic.ts) — `AnthropicProvider` chama `POST /v1/messages` com `system` no campo dedicado e mensagens user/assistant
- [`lib/llm/openai.ts`](../lib/llm/openai.ts) — `OpenAIProvider` chama `POST /v1/chat/completions` injetando system como primeira mensagem
- Ambos jogam `Error` com status + corpo truncado em falha — caller decide o que fazer

### Factory

- [`lib/llm/factory.ts`](../lib/llm/factory.ts) — agora **async**, resolve API key do vault em runtime (rotação sem redeploy):
  - `provider = 'stub'` → `StubProvider`
  - `provider = 'anthropic|openai'` mas sem `api_key_secret_id` → `StubProvider` (fallback seguro pra config parcial)
  - `vault` retorna `null` → `StubProvider`
  - Caso normal → provider real com `apiKey`, `model` (com defaults `claude-sonnet-4-6` / `gpt-4o-mini`), `temperature`, `maxTokens`

### Webhook

- Chamada do pipeline agora vive num `try/catch` específico
- Em erro de LLM (network, 401, rate limit) o handler manda uma resposta genérica de desculpas pelo Telegram (não fica calado nem expõe stack pro cliente final)
- `await createLLMProvider(...)` — assinatura mudou pra async

### Admin `/llm`

- [`app/(admin)/llm/page.tsx`](../app/%28admin%29/llm/page.tsx) — carrega `llm_config` via Supabase JS (RLS scope). Não traz a chave decifrada — só um boolean `hasApiKey` derivado de `api_key_secret_id`
- [`llm-form.tsx`](../app/%28admin%29/llm/llm-form.tsx) — 3 cards de provider, campo de modelo com placeholder por provider, campo de chave que mostra `••••` se já tem (deixar em branco = manter), temperatura/max_tokens com bounds, textarea de `system_extras`
- [`actions.ts`](../app/%28admin%29/llm/actions.ts) — server action valida com zod, chama RPC `set_llm_config` via Supabase JS

### Migration

- `llm_config_rpc` — `public.set_llm_config(provider, model, api_key, temperature, max_tokens, system_extras)`:
  - `provider = 'stub'`: apaga vault secret existente, zera `api_key_secret_id`
  - `provider != 'stub'` com nova chave: apaga old + cria new (não usei `vault.update_secret` pra evitar surpresa de signature)
  - `provider != 'stub'` sem nova chave: mantém `api_key_secret_id` atual
  - Validação interna: se não tem secret nem nova chave ao mudar pra anthropic/openai, lança exception
- SECURITY DEFINER, `SET search_path = public, extensions`, EXECUTE só pra `authenticated`

## Decisões

- **Vault é fonte da verdade pra chave; UI nunca recebe valor decifrado.** Form mostra `hasApiKey: boolean` e mascara com `••••`. Pra trocar, admin digita nova chave (deixar em branco preserva).
- **Factory async + lookup em runtime** — chave rotacionada no vault entra sem redeploy. Custo: 1 query SQL extra por webhook (≤ 5ms). Aceitável.
- **Fallback pro stub** quando config tá quebrada (provider real sem chave). Evita 500 e deixa o admin debugar pela UI sem o bot ficar inerte.
- **Erro do LLM → mensagem genérica de desculpas** ao usuário final. Alternativas consideradas: silêncio (péssima UX), stack trace (vaza interno), retentar (cara). Apologia genérica é o meio termo.
- **Delete + create no vault** em vez de `update_secret` — assinatura de `vault.update_secret` mudou entre versões da extensão; delete + create é estável e o `api_key_secret_id` é atualizado na mesma transação.
- **Modelos default no factory, não no DB.** `llm_config.model` pode ser NULL — quando estiver, usamos `claude-sonnet-4-6` (Anthropic) ou `gpt-4o-mini` (OpenAI). Admin pode sobrescrever pelo form.

## Como testar

1. `/llm` no painel
2. Provider = "anthropic" → modelo = `claude-sonnet-4-6` (ou deixe vazio pro default) → cole sua API key da Anthropic → Salvar
3. Manda "oi" pro bot → resposta agora vem do Claude com o tom configurado em `/tone`
4. Pra testar fallback: vai em `/llm`, salva com chave inválida (`sk-ant-invalid`) → manda "oi" → recebe "Desculpe, estou com problemas técnicos…"
5. Pra desativar: provider = "stub" → Salvar → bot volta a responder pelo stub determinístico

## Pendências passadas adiante

- **Sem prompt caching da Anthropic ainda** — payloads pequenos (1 system + 1-3 turns) não justificam. Quando FAQs entrarem na Phase 7 e o system prompt crescer, vale ligar `cache_control` no system block.
- **Sem retry** em erro transitório (429, 5xx). Telegram retries no nível de webhook resolveria parcialmente, mas estamos 200-ando os erros pra não disparar storm. Phase 9 (polish) pode adicionar retry com backoff antes do fallback genérico.
- **Sem dropdown de modelos** — input livre. Trade-off: mais flexível mas erro de digitação aparece só na primeira chamada. Aceitei pra não ter que manter lista atualizada.
- **Sem validação da API key na hora do save** — só quando uma mensagem chega. Daria pra fazer um `getMe`-equivalente (ex.: `POST /v1/messages` com prompt minúsculo) mas custa créditos. Pulei.

## Arquivos novos/modificados

```
app/(admin)/llm/page.tsx                                  [novo]
app/(admin)/llm/llm-form.tsx                              [novo]
app/(admin)/llm/actions.ts                                [novo]
app/api/channels/telegram/webhook/[id]/route.ts           [editado: factory async + LLM fallback]
lib/llm/anthropic.ts                                      [novo]
lib/llm/openai.ts                                         [novo]
lib/llm/factory.ts                                        [editado: async, vault, providers reais]
```

## Migrations aplicadas

- `llm_config_rpc`

Advisor: 3 warnings esperados (`authenticated_security_definer_function_executable` nos 3 RPCs intencionais) + 1 setting de dashboard.

## Commit

A ser feito após este doc.
