import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // Reuse the connection across hot reloads in development and across
  // serverless invocations within the same Lambda container in production.
  if (!global.__pgClient) {
    global.__pgClient = postgres(url, {
      prepare: false, // Required when using Supabase's transaction pooler.
      max: 1,
    });
  }
  return global.__pgClient;
}

export const db = drizzle(getClient(), { schema });
