import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

// One libSQL client for both environments:
//   local:      DATABASE_URL=file:data/benches.db  (the default)
//   production: DATABASE_URL=libsql://...turso.io + DATABASE_AUTH_TOKEN
// Tests create their own in-memory client with createDb(":memory:").

export type Db = Client;

export async function createDb(url: string, authToken?: string): Promise<Db> {
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  const db = createClient({ url, authToken });
  if (url.startsWith("file:")) await db.execute("PRAGMA journal_mode = WAL");
  await db.execute("PRAGMA foreign_keys = ON");
  await db.executeMultiple(SCHEMA); // idempotent: everything is IF NOT EXISTS
  return db;
}

const globalDb = globalThis as typeof globalThis & { __benchDb?: Promise<Db> };

// The app's shared connection, cached on globalThis so dev hot-reload does not
// open a new one on every save.
export function getDb(): Promise<Db> {
  globalDb.__benchDb ??= createDb(
    process.env.DATABASE_URL ?? "file:data/benches.db",
    process.env.DATABASE_AUTH_TOKEN,
  );
  return globalDb.__benchDb;
}
