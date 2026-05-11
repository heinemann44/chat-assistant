import { Bot } from "lucide-react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Bot className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Chat Assistant</h1>
            <p className="text-sm text-fg-muted">Acesso ao painel administrativo</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
