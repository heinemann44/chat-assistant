import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { FaqForm } from "../faq-form";

export const dynamic = "force-dynamic";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: faq } = await supabase
    .from("faqs")
    .select("id, question, answer, keywords, enabled")
    .eq("id", id)
    .single();

  if (!faq) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/faqs"
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar FAQ</h1>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <FaqForm
          mode="edit"
          initial={{
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords.join(", "),
            enabled: faq.enabled,
          }}
        />
      </section>
    </div>
  );
}
