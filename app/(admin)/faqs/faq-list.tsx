import { Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteFaq, toggleFaqEnabled } from "./actions";

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  enabled: boolean;
  updated_at: string;
};

export function FaqList({ faqs }: { faqs: FaqRow[] }) {
  if (faqs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-fg-muted">
        Nenhuma FAQ cadastrada. Comece adicionando uma no formulário acima.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {faqs.map((faq) => (
        <li
          key={faq.id}
          className="rounded-xl border border-border bg-surface-2 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{faq.question}</span>
                {!faq.enabled ? (
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-muted">
                    desativada
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-fg-muted">{faq.answer}</p>
              {faq.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {faq.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <form action={toggleFaqEnabled}>
                <input type="hidden" name="id" value={faq.id} />
                <input type="hidden" name="enabled" value={(!faq.enabled).toString()} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
                >
                  <Power className="h-3.5 w-3.5" />
                  {faq.enabled ? "Desativar" : "Ativar"}
                </button>
              </form>
              <Link
                href={`/faqs/${faq.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
              <form action={deleteFaq}>
                <input type="hidden" name="id" value={faq.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
