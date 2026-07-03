import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import pg from "pg";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";

const rawTables = [
  "raw_coingecko__coins_list",
  "raw_coingecko__asset_platforms_list",
  "raw_coingecko__trending_search",
  "raw_coingecko__crypto_global",
  "raw_coingecko__derivatives_exchanges",
  "raw_coingecko__exchanges",
  "raw_coingecko__coins_categories",
  "raw_coingecko__coins_id_history",
  "raw_coingecko__coins_id_ohlc",
];

test("bootstrap SQL is idempotent and defines the Phase 2 raw CoinGecko tables", () => {
  const sql = readFileSync("sql/bootstrap.sql", "utf8");

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS coingecko/);
  for (const table of rawTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS coingecko\\.${table}`));
  }
  assert.match(sql, /id text PRIMARY KEY/);
  assert.match(sql, /endpoint text NOT NULL/);
  assert.match(sql, /payload_jsonb jsonb NOT NULL/);
  assert.match(sql, /deleted_at timestamptz/);
});

test("db bootstrap creates the Phase 2 raw CoinGecko tables", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  await bootstrapDatabase();

  const client = new pg.Client({ connectionString: getDatabaseUrl(loadEnv()) });
  await client.connect();
  try {
    const result = await client.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'coingecko'
        and table_name = any($1)
      order by table_name, ordinal_position
    `, [rawTables]);

    for (const table of rawTables) {
      assert.deepEqual(
        result.rows.filter((row) => row.table_name === table).map((row) => row.column_name),
        ["id", "endpoint", "payload_jsonb", "created_at", "updated_at", "deleted_at"],
      );
    }
  } finally {
    await client.end();
  }
});
