"use client";

import {
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Sparkles,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/channels", label: "Canais", icon: <Bot className="h-4 w-4" /> },
  { href: "/tone", label: "Tom", icon: <Volume2 className="h-4 w-4" /> },
  { href: "/llm", label: "LLM", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/faqs", label: "FAQs", icon: <MessageCircleQuestion className="h-4 w-4" /> },
  { href: "/handoff", label: "Handoff", icon: <UserRound className="h-4 w-4" /> },
];

const SIDEBAR_WIDTH = "w-64";

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar — visible only below md. */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            <Menu className="h-4 w-4" />
          </button>
          <BrandMark />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {/* Desktop sidebar — visible from md up. */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden ${SIDEBAR_WIDTH} flex-col border-r border-border bg-surface-2 md:flex`}
      >
        <SidebarContent
          pathname={pathname}
          userEmail={userEmail}
          onNavigate={() => {}}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`relative z-10 flex h-full ${SIDEBAR_WIDTH} max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <BrandMark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarContent
            pathname={pathname}
            userEmail={userEmail}
            onNavigate={() => setOpen(false)}
            showBrandHeader={false}
          />
        </aside>
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  userEmail,
  onNavigate,
  showBrandHeader = true,
}: {
  pathname: string | null;
  userEmail: string;
  onNavigate: () => void;
  showBrandHeader?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      {showBrandHeader ? (
        <div className="flex h-14 items-center border-b border-border px-4">
          <BrandMark />
        </div>
      ) : null}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 truncate text-xs text-fg-muted">{userEmail}</div>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 text-sm font-semibold tracking-tight"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg">
        <Bot className="h-4 w-4" />
      </span>
      Chat Assistant
    </Link>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sair"
        title="Sair"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-fg-muted hover:bg-surface-3 hover:text-fg"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
