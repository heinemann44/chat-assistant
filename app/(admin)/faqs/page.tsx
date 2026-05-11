import { createSupabaseServerClient } from "@/lib/supabase/server";

import { FaqForm } from "./faq-form";
import { FaqList } from "./faq-list";

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("faqs")
    .select("id, question, answer, keywords, enabled, updated_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          FAQs
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Base de conhecimento
        </h1>
        <p className="text-sm text-fg-muted">
          Perguntas e respostas que o bot pode usar. As ativadas vão pro system prompt
          em toda mensagem.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Nova FAQ</h2>
        <FaqForm mode="create" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg-muted">Cadastradas</h2>
        <FaqList faqs={data ?? []} />
      </section>
    </div>
  );
}
