import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use from Server Components, Server Actions, and Route Handlers.
// Writes cookies when called from Server Actions or Route Handlers; in Server
// Components, set() throws — proxy.ts refreshes the session for those reads.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — proxy handles refresh.
          }
        },
      },
    },
  );
}
