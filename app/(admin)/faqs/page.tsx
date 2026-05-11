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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FAQs</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Perguntas e respostas que o bot pode usar como base de conhecimento.
          As ativadas vão no prompt do LLM em toda mensagem.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-sm font-medium">Nova FAQ</h2>
        <FaqForm mode="create" />
      </section>

      <FaqList faqs={data ?? []} />
    </div>
  );
}
