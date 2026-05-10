import { sql } from "drizzle-orm";

import { db } from "./client";

// Reads a plaintext secret from supabase_vault. Connection runs as the
// `postgres` role on the pooler, which has access to vault.decrypted_secrets;
// authenticated/anon never reach this code path.
export async function getDecryptedSecret(secretId: string): Promise<string | null> {
  const rows = await db.execute<{ decrypted_secret: string | null }>(
    sql`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId} LIMIT 1`,
  );
  // postgres-js result is iterable with rows; drizzle wraps it.
  const row = (rows as unknown as Array<{ decrypted_secret: string | null }>)[0];
  return row?.decrypted_secret ?? null;
}
