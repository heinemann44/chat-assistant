import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// API routes that handle their own auth (webhooks via secret, cron via
// CRON_SECRET). Anything under /api/* NOT in this list will be treated as a
// regular protected route — add new public endpoints here explicitly.
const PUBLIC_API_PREFIXES = ["/api/channels/"];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Refreshes the Supabase session on every request and enforces auth.
// Returns either the original NextResponse (allow) or a redirect.
export async function updateSession(request: NextRequest) {
  // Public API routes (webhooks, cron) handle their own auth and shouldn't
  // pay the cost of a Supabase Auth roundtrip on every request.
  if (isPublicApi(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Per @supabase/ssr docs: do not run logic between createServerClient and
  // getUser, and do not return early — the cookie refresh hooks must run.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // /api/* is already short-circuited above when public; here we only allow
  // /login through unauthenticated. Anything else (incl. unknown /api/*
  // routes) requires a session.
  const isPublicRoute = pathname === "/login";

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
