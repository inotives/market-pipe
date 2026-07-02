import assert from "node:assert/strict";
import pg from "pg";
import { test } from "node:test";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import { fetchCoinsList, ingestCoinsList } from "../dist/features/coingecko/runner.js";

test("fetchCoinsList validates mocked CoinGecko responses", async () => {
  const rows = await fetchCoinsList("demo", async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", extra: true }],
  }));

  assert.deepEqual(rows, [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", extra: true }]);
});

test("fetchCoinsList reports CoinGecko failures", async () => {
  await assert.rejects(
    fetchCoinsList("demo", async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
    })),
    /401 Unauthorized/,
  );
});

test("coins_list ingestion upserts rows without marking missing rows deleted", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("delete from coingecko.raw_coingecko__coins_list where id in ('market-pipe-alpha', 'market-pipe-beta')");
  } finally {
    await client.end();
  }

  await ingestCoinsList(
    [
      { id: "market-pipe-alpha", symbol: "alpha", name: "Alpha", extra: "first" },
      { id: "market-pipe-beta", symbol: "beta", name: "Beta" },
    ],
    connectionString,
  );
  await ingestCoinsList([{ id: "market-pipe-alpha", symbol: "alpha2", name: "Alpha Two", extra: "second" }], connectionString);

  const verify = new pg.Client({ connectionString });
  await verify.connect();
  try {
    const result = await verify.query(
      `
        select id, payload_jsonb, deleted_at
        from coingecko.raw_coingecko__coins_list
        where id in ('market-pipe-alpha', 'market-pipe-beta')
        order by id
      `,
    );

    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].payload_jsonb.symbol, "alpha2");
    assert.equal(result.rows[0].payload_jsonb.extra, "second");
    assert.equal(result.rows[0].deleted_at, null);
    assert.equal(result.rows[1].payload_jsonb.symbol, "beta");
    assert.equal(result.rows[1].deleted_at, null);
  } finally {
    await verify.end();
  }
});

test("opt-in live CoinGecko smoke can fetch and land rows", { skip: !process.env.MARKET_PIPE__RUN_LIVE_COINGECKO }, async () => {
  const env = loadEnv();
  assert.ok(env.MARKET_PIPE__COINGECKO_API_KEY, "MARKET_PIPE__COINGECKO_API_KEY is required");
  const connectionString = getDatabaseUrl(env);
  assert.ok(connectionString, "database config is required");

  await bootstrapDatabase();
  const rows = await fetchCoinsList(env.MARKET_PIPE__COINGECKO_API_KEY);
  assert.ok(rows.length > 0);
  assert.equal(await ingestCoinsList(rows.slice(0, 5), connectionString), 5);
});
