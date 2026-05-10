import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

function ok(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}
function warn(msg: string) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
}
function fail(msg: string): never {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}

async function check(label: string, url: string | undefined, expectations: {
  port: string;
  hostnameIncludes: string;
  usernameHasDot: boolean;
}) {
  console.log(`\n— ${label} —`);
  if (!url) {
    fail(`not set in .env.local`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(`not a valid URL`);
  }

  console.log(`  host:     ${parsed.hostname}`);
  console.log(`  port:     ${parsed.port}`);
  console.log(`  username: ${parsed.username}`);

  if (parsed.port !== expectations.port) {
    warn(`expected port ${expectations.port}, got ${parsed.port}`);
  }
  if (!parsed.hostname.includes(expectations.hostnameIncludes)) {
    warn(`expected hostname to include "${expectations.hostnameIncludes}"`);
  }
  if (expectations.usernameHasDot && !parsed.username.includes(".")) {
    warn(`pooler usernames are "postgres.PROJECT_REF" (with a dot) — yours is "${parsed.username}"`);
  }

  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 8 });
  try {
    const rows = await sql<{ ok: number; role: string }[]>`SELECT 1 AS ok, current_user AS role`;
    ok(`connected as ${rows[0]?.role}`);
  } catch (err) {
    const message = (err as Error).message;
    if (/tenant or user not found/i.test(message)) {
      console.error(`\x1b[31m✗\x1b[0m query failed: ${message}`);
      console.error("");
      console.error("  → The pooler does not recognize this tenant.");
      console.error("    Most common cause: wrong region or prefix in the hostname.");
      console.error("    Fix: copy the URL VERBATIM from Supabase dashboard");
      console.error("         Settings → Database → Connection string → Transaction pooler.");
      console.error("    Do not hand-edit the region — replace only [YOUR-PASSWORD].");
      process.exit(1);
    }
    fail(`query failed: ${message}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function main() {
  await check("DATABASE_URL (transaction pooler, runtime)", process.env.DATABASE_URL, {
    port: "6543",
    hostnameIncludes: "pooler.supabase.com",
    usernameHasDot: true,
  });

  await check("DIRECT_DATABASE_URL (direct, migrations)", process.env.DIRECT_DATABASE_URL, {
    port: "5432",
    hostnameIncludes: "supabase.co",
    usernameHasDot: false,
  });

  console.log("\nAll good.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
