import {
  Bot,
  MessageCircleQuestion,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: tenant }, channels, faqs, handoffs] = await Promise.all([
    supabase.from("tenants").select("id, name, created_at").single(),
    supabase.from("channel_instances").select("id, enabled"),
    supabase.from("faqs").select("id, enabled"),
    supabase.from("conversations").select("id").eq("state", "handoff_active"),
  ]);

  const channelsTotal = channels.data?.length ?? 0;
  const channelsActive = channels.data?.filter((c) => c.enabled).length ?? 0;
  const faqsTotal = faqs.data?.length ?? 0;
  const faqsActive = faqs.data?.filter((f) => f.enabled).length ?? 0;
  const handoffsActive = handoffs.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          Dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {tenant ? `Olá, ${tenant.name}.` : "Visão geral"}
        </h1>
        <p className="text-sm text-fg-muted">
          Visão geral do tenant e atalhos pras configurações.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Canais ativos"
          value={`${channelsActive} / ${channelsTotal}`}
          icon={<Bot className="h-4 w-4" />}
          href="/channels"
        />
        <StatCard
          label="FAQs ativas"
          value={`${faqsActive} / ${faqsTotal}`}
          icon={<MessageCircleQuestion className="h-4 w-4" />}
          href="/faqs"
        />
        <StatCard
          label="Handoffs abertos"
          value={String(handoffsActive)}
          icon={<UserRound className="h-4 w-4" />}
          href="/handoff"
          highlight={handoffsActive > 0}
        />
        <StatCard
          label="LLM"
          value="Configurar"
          icon={<Sparkles className="h-4 w-4" />}
          href="/llm"
          subtle
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface-2 p-5 lg:col-span-2">
          <h2 className="text-sm font-medium text-fg-muted">Tenant</h2>
          {tenant ? (
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-fg-subtle">Nome</dt>
                <dd className="mt-0.5 font-medium">{tenant.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle">ID</dt>
                <dd className="mt-0.5 truncate font-mono text-xs">{tenant.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Criado em</dt>
                <dd className="mt-0.5">
                  {new Date(tenant.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">
              Nenhum tenant encontrado. Reaplique a migration de seed.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-surface-2 p-5">
          <h2 className="text-sm font-medium text-fg-muted">Atalhos</h2>
          <ul className="mt-3 space-y-1">
            <ShortcutLink
              href="/tone"
              label="Editar tom"
              icon={<Volume2 className="h-4 w-4" />}
            />
            <ShortcutLink
              href="/faqs"
              label="Adicionar FAQ"
              icon={<MessageCircleQuestion className="h-4 w-4" />}
            />
            <ShortcutLink
              href="/handoff"
              label="Resolver handoffs"
              icon={<UserRound className="h-4 w-4" />}
            />
          </ul>
        </article>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
  highlight,
  subtle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-xl border p-4 transition-colors ${
        highlight
          ? "border-accent/40 bg-accent-soft"
          : "border-border bg-surface-2 hover:border-border-strong"
      }`}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {label}
        </p>
        <p
          className={`text-xl font-semibold tracking-tight sm:text-2xl ${
            subtle ? "text-fg-muted" : ""
          }`}
        >
          {value}
        </p>
      </div>
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
          highlight ? "bg-accent text-accent-fg" : "bg-surface-3 text-fg-muted"
        }`}
      >
        {icon}
      </span>
    </Link>
  );
}

function ShortcutLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        <span className="text-fg-subtle">{icon}</span>
        {label}
      </Link>
    </li>
  );
}
