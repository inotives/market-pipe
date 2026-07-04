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
const alphaVantageRawTables = ["raw_alphavantage__daily_stock_ohlcv"];
const customCsvRawTables = [
  "raw_custom_csv__economic_time_series",
  "raw_custom_csv__crypto_ohlcv",
];

test("bootstrap SQL is idempotent and defines the raw source tables", () => {
  const sql = readFileSync("sql/bootstrap.sql", "utf8");

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS coingecko/);
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS alphavantage/);
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS custom_csv/);
  for (const table of rawTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS coingecko\\.${table}`));
  }
  for (const table of alphaVantageRawTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS alphavantage\\.${table}`));
  }
  for (const table of customCsvRawTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS custom_csv\\.${table}`));
  }
  assert.match(sql, /id text PRIMARY KEY/);
  assert.match(sql, /endpoint text NOT NULL/);
  assert.match(sql, /payload_jsonb jsonb NOT NULL/);
  assert.match(sql, /entity text NOT NULL/);
  assert.match(sql, /csv_path text NOT NULL/);
  assert.match(sql, /header_shape jsonb NOT NULL/);
  assert.match(sql, /row_data jsonb NOT NULL/);
  assert.match(sql, /deleted_at timestamptz/);
});

test("db bootstrap creates the raw source tables", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  await bootstrapDatabase();

  const client = new pg.Client({ connectionString: getDatabaseUrl(loadEnv()) });
  await client.connect();
  try {
    const schemas = await client.query(`
      select schema_name
      from information_schema.schemata
      where schema_name in ('coingecko', 'alphavantage', 'custom_csv')
      order by schema_name
    `);
    assert.deepEqual(schemas.rows.map((row) => row.schema_name), ["alphavantage", "coingecko", "custom_csv"]);

    const result = await client.query(`
      select table_schema, table_name, column_name
      from information_schema.columns
      where (table_schema = 'coingecko' and table_name = any($1))
         or (table_schema = 'alphavantage' and table_name = any($2))
         or (table_schema = 'custom_csv' and table_name = any($3))
      order by table_name, ordinal_position
    `, [rawTables, alphaVantageRawTables, customCsvRawTables]);

    for (const table of rawTables) {
      assert.deepEqual(
        result.rows.filter((row) => row.table_name === table).map((row) => row.column_name),
        ["id", "endpoint", "payload_jsonb", "created_at", "updated_at", "deleted_at"],
      );
    }
    for (const table of alphaVantageRawTables) {
      assert.deepEqual(
        result.rows.filter((row) => row.table_name === table).map((row) => row.column_name),
        ["id", "endpoint", "payload_jsonb", "created_at", "updated_at", "deleted_at"],
      );
    }
    for (const table of customCsvRawTables) {
      assert.deepEqual(
        result.rows.filter((row) => row.table_name === table).map((row) => row.column_name),
        ["id", "entity", "csv_path", "header_shape", "row_data", "created_at", "updated_at", "deleted_at"],
      );
    }
  } finally {
    await client.end();
  }
});
