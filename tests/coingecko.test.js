import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { loadCoinGeckoConfig, validateCoinGeckoConfig } from "../dist/features/coingecko/feature.js";
import { validateCoinGeckoPayload } from "../dist/features/coingecko/runner.js";
import { validateCoinsListRow } from "../dist/features/coingecko/schemas.js";

test("CoinGecko config contains Phase 2 entity metadata", () => {
  const raw = parse(readFileSync("src/features/coingecko/config.yaml", "utf8"));
  assert.deepEqual(raw.endpoints.map((endpoint) => endpoint.entity), [
    "coins_list",
    "asset_platforms_list",
    "trending_search",
    "crypto_global",
    "derivatives_exchanges",
    "exchanges",
    "coins_categories",
    "coins_id_history",
    "coins_id_ohlc",
  ]);

  const [coinsList] = loadCoinGeckoConfig().endpoints;
  assert.deepEqual(coinsList, {
    entity: "coins_list",
    endpoint: "/coins/list",
    table: "coingecko.raw_coingecko__coins_list",
    idField: "id",
  });

  assert.deepEqual(raw.endpoints.find((endpoint) => endpoint.entity === "crypto_global").schedule, {
    type: "hourly",
    minute: 10,
    cliArgs: ["coingecko", "run", "--entity", "crypto_global"],
  });

  assert.deepEqual(loadCoinGeckoConfig().endpoints.find((endpoint) => endpoint.entity === "coins_categories")?.schedule, {
    type: "manual",
  });
});

test("CoinGecko scheduled endpoints require runnable cliArgs", () => {
  assert.throws(
    () =>
      validateCoinGeckoConfig({
        endpoints: [
          {
            entity: "crypto_global",
            endpoint: "/global",
            table: "coingecko.raw_coingecko__crypto_global",
            idField: "global",
            schedule: {
              type: "hourly",
              minute: 10,
            },
          },
        ],
      }),
    /CoinGecko endpoint crypto_global scheduled config must contain cliArgs/,
  );

  assert.throws(
    () =>
      validateCoinGeckoConfig({
        endpoints: [
          {
            entity: "trending_search",
            endpoint: "/search/trending",
            table: "coingecko.raw_coingecko__trending_search",
            idField: "derived",
            schedule: {
              type: "daily",
              timeUtc: "25:00:00",
              cliArgs: ["coingecko", "run", "--entity", "trending_search"],
            },
          },
        ],
      }),
    /CoinGecko endpoint trending_search daily schedule must contain timeUtc in HH:MM:SS format/,
  );
});

test("coins_list validation accepts identity fields and preserves extra payload", () => {
  const row = { id: "bitcoin", symbol: "btc", name: "Bitcoin", platforms: { ethereum: "0x0" } };
  assert.equal(validateCoinsListRow(row), row);
});

test("coins_list validation fails when identity fields are missing", () => {
  assert.throws(() => validateCoinsListRow({ symbol: "btc", name: "Bitcoin" }), /missing id/);
  assert.throws(() => validateCoinsListRow({ id: "bitcoin", name: "Bitcoin" }), /missing symbol/);
  assert.throws(() => validateCoinsListRow({ id: "bitcoin", symbol: "btc" }), /missing name/);
});

test("CoinGecko runner validates coins_list payload arrays", () => {
  assert.deepEqual(validateCoinGeckoPayload("coins_list", [{ id: "bitcoin", symbol: "btc", name: "Bitcoin" }]), [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin" },
  ]);
  assert.throws(() => validateCoinGeckoPayload("global", []), /Unsupported CoinGecko entity/);
});
