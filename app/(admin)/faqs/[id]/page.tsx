import { ArrowLeft } from "lucide-react";
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
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/faqs"
          className="inline-flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            FAQ
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Editar
          </h1>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
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
