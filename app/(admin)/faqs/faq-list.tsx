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
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        Nenhuma FAQ cadastrada. Comece adicionando uma no formulário acima.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {faqs.map((faq) => (
        <li
          key={faq.id}
          className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{faq.question}</span>
                {!faq.enabled ? (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    desativada
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {faq.answer}
              </p>
              {faq.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {faq.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <form action={toggleFaqEnabled}>
                <input type="hidden" name="id" value={faq.id} />
                <input type="hidden" name="enabled" value={(!faq.enabled).toString()} />
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {faq.enabled ? "Desativar" : "Ativar"}
                </button>
              </form>
              <Link
                href={`/faqs/${faq.id}`}
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Editar
              </Link>
              <form action={deleteFaq}>
                <input type="hidden" name="id" value={faq.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
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
