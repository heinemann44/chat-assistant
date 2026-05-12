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

// Defense-in-depth: server actions should not rely solely on RLS + proxy.
// Call requireUser() first to guarantee the session is alive — if cookies are
// expired or the user is logged out, abort the action explicitly instead of
// silently hitting RLS with `auth.uid()` = null.
export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return { supabase, user };
}
