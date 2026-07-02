import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import pg from "pg";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";

test("bootstrap SQL is idempotent and defines the raw coins_list table", () => {
  const sql = readFileSync("sql/bootstrap.sql", "utf8");

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS coingecko/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS coingecko\.raw_coingecko__coins_list/);
  assert.match(sql, /id text PRIMARY KEY/);
  assert.match(sql, /endpoint text NOT NULL/);
  assert.match(sql, /payload_jsonb jsonb NOT NULL/);
  assert.match(sql, /deleted_at timestamptz/);
});

test("db bootstrap creates the raw coins_list table", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  await bootstrapDatabase();

  const client = new pg.Client({ connectionString: getDatabaseUrl(loadEnv()) });
  await client.connect();
  try {
    const result = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'coingecko'
        and table_name = 'raw_coingecko__coins_list'
      order by ordinal_position
    `);

    assert.deepEqual(
      result.rows.map((row) => row.column_name),
      ["id", "endpoint", "payload_jsonb", "created_at", "updated_at", "deleted_at"],
    );
  } finally {
    await client.end();
  }
});
