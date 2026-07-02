import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { checkConfig, getDatabaseUrl, loadEnv } from "./config.js";

const bootstrapSqlPath = resolve(dirname(fileURLToPath(import.meta.url)), "../sql/bootstrap.sql");

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
    await client.query(readFileSync(bootstrapSqlPath, "utf8"));
  } finally {
    await client.end();
  }
}
