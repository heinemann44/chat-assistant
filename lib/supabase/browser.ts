import { createBrowserClient } from "@supabase/ssr";

// Use in Client Components when you need auth state in the browser (e.g.,
// reactive sign-out button). For data fetching, prefer Server Components +
// createSupabaseServerClient.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
