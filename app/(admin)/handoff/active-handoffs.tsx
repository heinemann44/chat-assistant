import { resolveHandoff } from "./actions";

type ActiveHandoff = {
  id: string;
  external_user_id: string;
  external_user_name: string | null;
  handoff_until: string | null;
  updated_at: string;
};

export function ActiveHandoffs({ handoffs }: { handoffs: ActiveHandoff[] }) {
  if (handoffs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        Nenhum handoff ativo no momento.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {handoffs.map((h) => (
        <li
          key={h.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="space-y-1 text-sm">
            <div className="font-medium">
              {h.external_user_name ?? h.external_user_id}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              ID: <span className="font-mono">{h.external_user_id}</span>
              {h.handoff_until ? (
                <>
                  {" · "}
                  expira em {new Date(h.handoff_until).toLocaleString("pt-BR")}
                </>
              ) : null}
            </div>
          </div>
          <form action={resolveHandoff}>
            <input type="hidden" name="conversationId" value={h.id} />
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Resolver
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
