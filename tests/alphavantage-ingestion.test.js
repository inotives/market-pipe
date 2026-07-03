import assert from "node:assert/strict";
import pg from "pg";
import { test } from "node:test";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import {
  extractAlphaVantageRows,
  ingestAlphaVantageRows,
  runAlphaVantageDaily,
  runAlphaVantageSymbols,
} from "../dist/features/alphavantage/runner.js";

test("Alpha Vantage daily extraction maps each candle to one raw row", () => {
  const rows = extractAlphaVantageRows(
    {
      "Meta Data": { "2. Symbol": "MSFT" },
      "Time Series (Daily)": {
        "2026-07-02": { "1. open": "500.00", "4. close": "505.00", "5. volume": "1000" },
        "2026-07-01": { "1. open": "490.00", "4. close": "495.00", "5. volume": "900" },
      },
    },
    { symbol: "MSFT" },
  );

  assert.deepEqual(rows, [
    {
      id: "MSFT:2026-07-02",
      payload: {
        symbol: "MSFT",
        observed_at: "2026-07-02",
        interval: "daily",
        source: "alphavantage",
        candle: { "1. open": "500.00", "4. close": "505.00", "5. volume": "1000" },
      },
    },
    {
      id: "MSFT:2026-07-01",
      payload: {
        symbol: "MSFT",
        observed_at: "2026-07-01",
        interval: "daily",
        source: "alphavantage",
        candle: { "1. open": "490.00", "4. close": "495.00", "5. volume": "900" },
      },
    },
  ]);
});

test("Alpha Vantage daily extraction fails clearly when the daily series is missing", () => {
  assert.throws(
    () => extractAlphaVantageRows({ "Meta Data": { "2. Symbol": "MSFT" } }, { symbol: "MSFT" }),
    /must contain Time Series \(Daily\)/,
  );
});

test("Alpha Vantage run with --symbol only executes the requested symbol", async () => {
  const seen = [];

  const count = await runAlphaVantageSymbols({
    symbol: "MSFT",
    env: { MARKET_PIPE__ALPHAVANTAGE_API_KEY: "demo" },
    runSymbol: async (symbol) => {
      seen.push(symbol);
      return 2;
    },
    sleep: async () => assert.fail("sleep should not run for single-symbol mode"),
  });

  assert.deepEqual(seen, ["MSFT"]);
  assert.equal(count, 2);
});

test("Alpha Vantage default run loops through YAML symbols and waits between symbols", async () => {
  const seen = [];
  const delays = [];

  const count = await runAlphaVantageSymbols({
    env: { MARKET_PIPE__ALPHAVANTAGE_API_KEY: "demo" },
    runSymbol: async (symbol) => {
      seen.push(symbol);
      return 1;
    },
    sleep: async (ms) => {
      delays.push(ms);
    },
  });

  assert.deepEqual(seen, ["SPCX", "TSM", "MSFT", "GOOG", "NVDA"]);
  assert.deepEqual(delays, [15000, 15000, 15000, 15000]);
  assert.equal(count, 5);
});

test("Alpha Vantage default run applies the quota guard before starting the loop", async () => {
  let calls = 0;

  await assert.rejects(
    runAlphaVantageSymbols({
      symbols: Array.from({ length: 26 }, (_, index) => `SYM${index}`),
      env: { MARKET_PIPE__ALPHAVANTAGE_API_KEY: "demo" },
      runSymbol: async () => {
        calls += 1;
        return 1;
      },
      sleep: async () => undefined,
    }),
    /exceeds quota\.dailyRequestLimit 25/,
  );

  assert.equal(calls, 0);
});

test("Alpha Vantage raw landing is idempotent at symbol observed_at grain", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      "delete from alphavantage.raw_alphavantage__daily_stock_ohlcv where id in ('MSFT:2026-07-01', 'MSFT:2026-07-02')",
    );
  } finally {
    await client.end();
  }

  const first = extractAlphaVantageRows(
    {
      "Time Series (Daily)": {
        "2026-07-02": { "4. close": "505.00" },
        "2026-07-01": { "4. close": "495.00" },
      },
    },
    { symbol: "MSFT" },
  );
  const second = extractAlphaVantageRows(
    {
      "Time Series (Daily)": {
        "2026-07-02": { "4. close": "515.00" },
        "2026-07-01": { "4. close": "495.00" },
      },
    },
    { symbol: "MSFT" },
  );

  await ingestAlphaVantageRows("daily", first, connectionString);
  await ingestAlphaVantageRows("daily", second, connectionString);

  const verify = new pg.Client({ connectionString });
  await verify.connect();
  try {
    const result = await verify.query(`
      select id, endpoint, payload_jsonb
      from alphavantage.raw_alphavantage__daily_stock_ohlcv
      where id in ('MSFT:2026-07-01', 'MSFT:2026-07-02')
      order by id
    `);

    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].id, "MSFT:2026-07-01");
    assert.equal(result.rows[0].endpoint, "TIME_SERIES_DAILY");
    assert.equal(result.rows[0].payload_jsonb.symbol, "MSFT");
    assert.equal(result.rows[1].id, "MSFT:2026-07-02");
    assert.equal(result.rows[1].endpoint, "TIME_SERIES_DAILY");
    assert.equal(result.rows[1].payload_jsonb.candle["4. close"], "515.00");
  } finally {
    await verify.end();
  }
});

test("opt-in live Alpha Vantage smoke runs one symbol with MSFT as the default", { skip: !process.env.MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE }, async () => {
  const env = loadEnv();
  assert.ok(env.MARKET_PIPE__ALPHAVANTAGE_API_KEY, "MARKET_PIPE__ALPHAVANTAGE_API_KEY is required");
  const connectionString = getDatabaseUrl(env);
  assert.ok(connectionString, "database config is required");

  const symbol = env.MARKET_PIPE__ALPHAVANTAGE_LIVE_SYMBOL ?? "MSFT";
  await bootstrapDatabase();

  const count = await runAlphaVantageDaily(symbol);
  assert.ok(count > 0);
});
