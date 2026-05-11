import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: proxy already redirects unauthenticated users, but a
  // server-side check here protects against proxy misconfiguration.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-surface">
      <AdminNav userEmail={user.email ?? "—"} />
      {/* On md+ the sidebar is a fixed 16rem column on the left — push the
          main content over by the same amount. On mobile the top bar takes
          its own space in the document flow. */}
      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
