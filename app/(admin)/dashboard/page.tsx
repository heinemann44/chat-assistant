import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  // Will return the tenant row scoped by RLS (current_tenant_id()).
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, created_at")
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Visão geral do tenant.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Tenant
        </h2>
        {tenant ? (
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Nome</dt>
              <dd className="font-medium">{tenant.name}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">ID</dt>
              <dd className="font-mono text-xs">{tenant.id}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Criado em</dt>
              <dd>{new Date(tenant.created_at).toLocaleString("pt-BR")}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum tenant encontrado. Reaplique a migration de seed.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        Próximas seções (canais, tom, LLM, FAQs, handoff) serão habilitadas
        conforme as fases avançam.
      </section>
    </div>
  );
}
