import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { checkConfig, getDatabaseUrl, loadEnv } from "./config.js";

const bootstrapSqlPath = resolve(dirname(fileURLToPath(import.meta.url)), "../sql/bootstrap.sql");
const bootstrapLockKey = 9_203_001;

export async function bootstrapDatabase(): Promise<void> {
  const env = loadEnv();
  const check = checkConfig("db", env);
  if (!check.ok) {
    throw new Error(`Missing db config: ${check.missing.join(", ")}`);
  }

  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing db config: MARKET_PIPE__DATABASE_URL");
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock($1)", [bootstrapLockKey]);
      await client.query(readFileSync(bootstrapSqlPath, "utf8"));
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    await client.end();
  }
}
