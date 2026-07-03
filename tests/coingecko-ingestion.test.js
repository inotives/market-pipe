import assert from "node:assert/strict";
import pg from "pg";
import { test } from "node:test";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import {
  extractCoinGeckoRows,
  fetchCoinGeckoEntity,
  fetchCoinsList,
  ingestCoinGeckoRows,
  ingestCoinsList,
  runCoinGeckoEntity,
} from "../dist/features/coingecko/runner.js";

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
      headers: new Headers(),
      json: async () => ({}),
    })),
    /401 Unauthorized/,
  );
});

test("fetchCoinsList retries transient failures", async () => {
  let calls = 0;
  const delays = [];
  const rows = await fetchCoinsList(
    "demo",
    async () => {
      calls += 1;
      if (calls < 3) {
        return {
          ok: false,
          status: 503,
          statusText: "Unavailable",
          headers: new Headers(),
          json: async () => ({}),
        };
      }

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => [{ id: "bitcoin", symbol: "btc", name: "Bitcoin" }],
      };
    },
    {
      env: { MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS: "3", MARKET_PIPE__COINGECKO_RETRY_BASE_MS: "10" },
      sleep: async (ms) => {
        delays.push(ms);
      },
    },
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.equal(rows.length, 1);
});

test("fetchCoinsList respects Retry-After", async () => {
  let calls = 0;
  const delays = [];

  await fetchCoinsList(
    "demo",
    async () => {
      calls += 1;
      return calls === 1
        ? {
            ok: false,
            status: 429,
            statusText: "Rate Limited",
            headers: new Headers({ "retry-after": "2" }),
            json: async () => ({}),
          }
        : {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: new Headers(),
            json: async () => [{ id: "bitcoin", symbol: "btc", name: "Bitcoin" }],
          };
    },
    {
      env: { MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS: "2", MARKET_PIPE__COINGECKO_RETRY_BASE_MS: "10" },
      sleep: async (ms) => {
        delays.push(ms);
      },
    },
  );

  assert.deepEqual(delays, [2000]);
});

test("fetchCoinsList does not retry non-retryable failures", async () => {
  let calls = 0;

  await assert.rejects(
    fetchCoinsList(
      "demo",
      async () => {
        calls += 1;
        return {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: new Headers(),
          json: async () => ({}),
        };
      },
      { sleep: async () => assert.fail("sleep should not run") },
    ),
    /401 Unauthorized/,
  );

  assert.equal(calls, 1);
});

test("extractCoinGeckoRows maps simple entities into raw rows", () => {
  assert.deepEqual(extractCoinGeckoRows("asset_platforms_list", [{ id: "ethereum", chain_identifier: 1 }]), [
    { id: "ethereum", payload: { id: "ethereum", chain_identifier: 1 } },
  ]);
  assert.deepEqual(
    extractCoinGeckoRows("asset_platforms_list", [{ id: "", native_coin_id: "mavryk-network", name: "Mavryk Network" }]),
    [{ id: "native_coin:mavryk-network", payload: { id: "", native_coin_id: "mavryk-network", name: "Mavryk Network" } }],
  );
  assert.deepEqual(extractCoinGeckoRows("derivatives_exchanges", [{ id: "bitmex", name: "BitMEX" }]), [
    { id: "bitmex", payload: { id: "bitmex", name: "BitMEX" } },
  ]);
  assert.deepEqual(extractCoinGeckoRows("exchanges", [{ id: "binance", name: "Binance" }]), [
    { id: "binance", payload: { id: "binance", name: "Binance" } },
  ]);
  assert.deepEqual(extractCoinGeckoRows("coins_categories", [{ id: "defi", name: "DeFi" }]), [
    { id: "defi", payload: { id: "defi", name: "DeFi" } },
  ]);
  assert.deepEqual(extractCoinGeckoRows("crypto_global", { data: { active_cryptocurrencies: 1 } }), [
    { id: "global", payload: { data: { active_cryptocurrencies: 1 } } },
  ]);
  assert.deepEqual(
    extractCoinGeckoRows("trending_search", {
      coins: [{ item: { id: "bitcoin", name: "Bitcoin" } }],
      nfts: [{ id: "sproto", name: "Sproto" }],
      categories: [{ id: 324, name: "DeFi" }],
    }),
    [
      { id: "coin:bitcoin", payload: { type: "coin", item: { item: { id: "bitcoin", name: "Bitcoin" } } } },
      { id: "nft:sproto", payload: { type: "nft", item: { id: "sproto", name: "Sproto" } } },
      { id: "category:324", payload: { type: "category", item: { id: 324, name: "DeFi" } } },
    ],
  );
  assert.deepEqual(
    extractCoinGeckoRows("coins_id_history", { id: "bitcoin", market_data: {} }, { id: "bitcoin", date: "01-07-2026" }),
    [{ id: "bitcoin:01-07-2026", payload: { id: "bitcoin", market_data: {} } }],
  );
  assert.deepEqual(
    extractCoinGeckoRows("coins_id_ohlc", [[1, 2, 3, 4, 5]], { id: "bitcoin", vsCurrency: "usd", days: "30" }),
    [{ id: "bitcoin:usd:30", payload: [[1, 2, 3, 4, 5]] }],
  );
});

test("extractCoinGeckoRows fails when required ids are missing", () => {
  assert.throws(
    () => extractCoinGeckoRows("asset_platforms_list", [{ id: "", native_coin_id: "" }]),
    /missing platform.id and native_coin_id/,
  );
  assert.throws(
    () => extractCoinGeckoRows("trending_search", { coins: [{ item: { id: "" } }], nfts: [], categories: [] }),
    /missing item.item.id/,
  );
  assert.throws(() => extractCoinGeckoRows("exchanges", [{ name: "Binance" }]), /missing exchange.id/);
  assert.throws(() => extractCoinGeckoRows("coins_categories", [{ name: "DeFi" }]), /missing category.id/);
});

test("runCoinGeckoEntity validates parameterized entities before network calls", async () => {
  await assert.rejects(
    runCoinGeckoEntity("coins_id_history", async () => {
      throw new Error("should not fetch");
    }),
    /requires --id/,
  );
  await assert.rejects(
    runCoinGeckoEntity(
      "coins_id_ohlc",
      async () => {
        throw new Error("should not fetch");
      },
      { id: "bitcoin", vsCurrency: "usd", days: "2" },
    ),
    /requires --days to be one of/,
  );
});

test("parameterized CoinGecko entities build one raw row per request", async () => {
  const historyRequests = [];
  const ohlcRequests = [];

  await fetchCoinGeckoEntity(
    "coins_id_history",
    "demo",
    async (url) => {
      historyRequests.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => ({ id: "bitcoin", history: true }),
      };
    },
    {},
    { id: "bitcoin", date: "01-07-2026" },
  );

  await fetchCoinGeckoEntity(
    "coins_id_ohlc",
    "demo",
    async (url) => {
      ohlcRequests.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => [[1, 2, 3, 4, 5]],
      };
    },
    {},
    { id: "bitcoin", vsCurrency: "usd", days: "30" },
  );

  assert.equal(historyRequests[0], "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=01-07-2026");
  assert.equal(ohlcRequests[0], "https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30");
});

test("paginated CoinGecko entities request bounded pages", async () => {
  const urls = [];
  const payload = await fetchCoinGeckoEntity(
    "exchanges",
    "demo",
    async (url) => {
      urls.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () =>
          urls.length === 1
            ? [{ id: "binance" }, { id: "kraken" }]
            : [{ id: "coinbase" }],
      };
    },
    { env: { MARKET_PIPE__COINGECKO_PAGE_LIMIT: "3", MARKET_PIPE__COINGECKO_PER_PAGE: "2" } },
  );

  assert.deepEqual(urls, [
    "https://api.coingecko.com/api/v3/exchanges?page=1&per_page=2",
    "https://api.coingecko.com/api/v3/exchanges?page=2&per_page=2",
  ]);
  assert.deepEqual(payload, [{ id: "binance" }, { id: "kraken" }, { id: "coinbase" }]);
});

test("paginated CoinGecko entities validate page values", async () => {
  await assert.rejects(
    runCoinGeckoEntity("exchanges", async () => {
      throw new Error("should not fetch");
    }, { pageLimit: "0" }),
    /page limit to be a positive integer/,
  );
  await assert.rejects(
    runCoinGeckoEntity("derivatives_exchanges", async () => {
      throw new Error("should not fetch");
    }, { perPage: "0" }),
    /per page to be a positive integer/,
  );
});

test("paginated CoinGecko entities also support derivatives_exchanges", async () => {
  const urls = [];
  const payload = await fetchCoinGeckoEntity(
    "derivatives_exchanges",
    "demo",
    async (url) => {
      urls.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => [{ id: "bitmex" }],
      };
    },
    { env: { MARKET_PIPE__COINGECKO_PAGE_LIMIT: "2", MARKET_PIPE__COINGECKO_PER_PAGE: "250" } },
  );

  assert.deepEqual(urls, [
    "https://api.coingecko.com/api/v3/derivatives/exchanges?page=1&per_page=250",
  ]);
  assert.deepEqual(payload, [{ id: "bitmex" }]);
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

test("simple CoinGecko entities land in their raw tables without duplicates", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await ingestCoinGeckoRows(
    "trending_search",
    extractCoinGeckoRows("trending_search", {
      coins: [{ item: { id: "market-pipe-bitcoin", name: "Bitcoin" } }],
      nfts: [{ id: "market-pipe-nft", name: "NFT" }],
      categories: [{ id: "market-pipe-category", name: "Category" }],
    }),
    connectionString,
  );
  await ingestCoinGeckoRows(
    "trending_search",
    extractCoinGeckoRows("trending_search", {
      coins: [{ item: { id: "market-pipe-bitcoin", name: "Bitcoin 2" } }],
      nfts: [{ id: "market-pipe-nft", name: "NFT 2" }],
      categories: [{ id: "market-pipe-category", name: "Category 2" }],
    }),
    connectionString,
  );

  const verify = new pg.Client({ connectionString });
  await verify.connect();
  try {
    const result = await verify.query(`
      select id, payload_jsonb
      from coingecko.raw_coingecko__trending_search
      where id in ('coin:market-pipe-bitcoin', 'nft:market-pipe-nft', 'category:market-pipe-category')
      order by id
    `);

    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].payload_jsonb.type, "category");
    assert.equal(result.rows[1].payload_jsonb.type, "coin");
    assert.equal(result.rows[2].payload_jsonb.type, "nft");
  } finally {
    await verify.end();
  }
});

test("multi-page paginated entities upsert without duplicate raw rows", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  const pageOne = extractCoinGeckoRows("exchanges", [
    { id: "market-pipe-binance", name: "Binance One" },
    { id: "market-pipe-kraken", name: "Kraken" },
  ]);
  const pageTwo = extractCoinGeckoRows("exchanges", [
    { id: "market-pipe-binance", name: "Binance Two" },
    { id: "market-pipe-coinbase", name: "Coinbase" },
  ]);

  await ingestCoinGeckoRows("exchanges", pageOne, connectionString);
  await ingestCoinGeckoRows("exchanges", pageTwo, connectionString);

  const verify = new pg.Client({ connectionString });
  await verify.connect();
  try {
    const result = await verify.query(`
      select id, payload_jsonb
      from coingecko.raw_coingecko__exchanges
      where id in ('market-pipe-binance', 'market-pipe-kraken', 'market-pipe-coinbase')
      order by id
    `);

    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].id, "market-pipe-binance");
    assert.equal(result.rows[0].payload_jsonb.name, "Binance Two");
    assert.equal(result.rows[1].id, "market-pipe-coinbase");
    assert.equal(result.rows[2].id, "market-pipe-kraken");
  } finally {
    await verify.end();
  }
});

test("parameterized entities upsert with stable composite ids", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  const first = extractCoinGeckoRows(
    "coins_id_history",
    { id: "bitcoin", market_data: { price: 100 } },
    { id: "bitcoin", date: "01-07-2026" },
  );
  const second = extractCoinGeckoRows(
    "coins_id_history",
    { id: "bitcoin", market_data: { price: 200 } },
    { id: "bitcoin", date: "01-07-2026" },
  );

  await ingestCoinGeckoRows("coins_id_history", first, connectionString);
  await ingestCoinGeckoRows("coins_id_history", second, connectionString);

  const verify = new pg.Client({ connectionString });
  await verify.connect();
  try {
    const result = await verify.query(`
      select id, payload_jsonb
      from coingecko.raw_coingecko__coins_id_history
      where id = 'bitcoin:01-07-2026'
    `);

    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].id, "bitcoin:01-07-2026");
    assert.equal(result.rows[0].payload_jsonb.market_data.price, 200);
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
