import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Chat Assistant</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Acesso ao painel administrativo
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
