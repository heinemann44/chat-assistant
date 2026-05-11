import { Check, UserRound } from "lucide-react";

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
      <div className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-fg-muted">
        Nenhum handoff ativo no momento.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {handoffs.map((h) => (
        <li
          key={h.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                {h.external_user_name ?? h.external_user_id}
              </div>
              <div className="text-xs text-fg-muted">
                ID: <span className="font-mono">{h.external_user_id}</span>
                {h.handoff_until ? (
                  <>
                    {" · "}
                    expira em {new Date(h.handoff_until).toLocaleString("pt-BR")}
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <form action={resolveHandoff} className="sm:shrink-0">
            <input type="hidden" name="conversationId" value={h.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
            >
              <Check className="h-3.5 w-3.5" />
              Resolver
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
