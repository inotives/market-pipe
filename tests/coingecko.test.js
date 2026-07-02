import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { loadCoinGeckoConfig } from "../dist/features/coingecko/feature.js";
import { validateCoinGeckoPayload } from "../dist/features/coingecko/runner.js";
import { validateCoinsListRow } from "../dist/features/coingecko/schemas.js";

test("CoinGecko config contains only coins_list metadata", () => {
  const raw = parse(readFileSync("src/features/coingecko/config.yaml", "utf8"));
  assert.deepEqual(raw.endpoints.map((endpoint) => endpoint.entity), ["coins_list"]);

  const [coinsList] = loadCoinGeckoConfig().endpoints;
  assert.deepEqual(coinsList, {
    entity: "coins_list",
    endpoint: "/coins/list",
    table: "coingecko.raw_coingecko__coins_list",
    idField: "id",
  });
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
