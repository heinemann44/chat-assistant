# Phase 5 — Tom configurável

**Status:** ✅ Concluída
**Objetivo:** Permitir que o admin escolha tom pelo painel; pipeline já lia do DB desde Phase 4, então a fase é puramente UI + ação.

## O que foi feito

- [`app/(admin)/tone/page.tsx`](../app/%28admin%29/tone/page.tsx) — server component carrega `preset` + `custom_instructions` de `tone_config` via Supabase JS (RLS scopes)
- [`app/(admin)/tone/tone-form.tsx`](../app/%28admin%29/tone/tone-form.tsx) — client form com 4 cards clicáveis (formal/casual/descontraido/custom) + textarea pra instruções customizadas
- [`app/(admin)/tone/actions.ts`](../app/%28admin%29/tone/actions.ts) — `updateTone` server action:
  - Zod valida o preset (enum) e o tamanho de `customInstructions` (≤ 2000)
  - Refine garante que `custom` exige instruções não-vazias
  - Resolve `tenant_id` via `admin_users` (RLS retorna só a row do próprio user)
  - UPDATE em `tone_config` (RLS aplica também na escrita)
  - `revalidatePath("/tone")` pra refletir o salvamento

Sem migrations nessa fase — `tone_config` já existia desde Phase 1 e o pipeline já consumia desde Phase 4.

## Decisões

- **Cards de seleção em vez de radio "puro"** — visual carrega a descrição de cada preset, ajuda admin a entender a diferença sem precisar testar. O `<input type="radio">` real fica `sr-only` (acessibilidade preservada).
- **Textarea sempre visível, não desabilitada** — admin pode escrever instruções de antemão e depois alternar entre `custom` e outro preset sem perder o conteúdo.
- **`custom_instructions` é zerado quando preset != custom** — evita que instruções "fantasmas" fiquem no banco. Se admin volta pra custom no futuro, escreve de novo.
- **Server action descobre o tenant via `admin_users`** em vez de passar `tenant_id` pelo form. Não dá pra confiar em hidden field no client (poderia ser forjado), e RLS já tem todo o gating.

## Como verificar

1. `/tone` → muda preset → "Salvar"
2. Manda "oi" pro bot
3. Resposta do stub muda conforme o tom (detecta "tom formal" / "tom descontra" no system prompt)

## Pendências passadas adiante

- **Preview da resposta** no painel — seria útil mostrar "como o bot responderia a 'oi' com esse tom" sem precisar ir no Telegram. Phase tardia, talvez 9 (polish).
- **Histórico de mudanças de tom** — auditoria. Não pedida, não fiz.

## Arquivos novos

```
app/(admin)/tone/page.tsx
app/(admin)/tone/tone-form.tsx
app/(admin)/tone/actions.ts
```

## Commit

A ser feito após este doc.
