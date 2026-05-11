"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Sync with whatever the inline init script already applied to <html>.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage blocked — no-op */
    }
    setTheme(next);
  }

  // Avoid mismatched icon on first paint: render nothing until we know the
  // current theme (server renders nothing; client decides post-mount).
  if (theme === null) {
    return (
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-fg-muted"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
