import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

test("dbt staging sources declare the two CoinGecko raw tables", () => {
  const spec = parse(readFileSync("transforms/models/staging/coingecko/_coingecko__models.yml", "utf8"));

  assert.equal(spec.sources[0].name, "coingecko");
  assert.equal(spec.sources[0].schema, "coingecko");
  assert.deepEqual(
    spec.sources[0].tables.map((table) => table.name),
    ["raw_coingecko__coins_list", "raw_coingecko__asset_platforms_list"],
  );
});

test("dbt staging models read from explicit CoinGecko sources", () => {
  const coinsSql = readFileSync("transforms/models/staging/coingecko/stg__coins_list.sql", "utf8");
  const platformsSql = readFileSync("transforms/models/staging/coingecko/stg__asset_platforms_list.sql", "utf8");

  assert.match(coinsSql, /source\('coingecko', 'raw_coingecko__coins_list'\)/);
  assert.match(platformsSql, /source\('coingecko', 'raw_coingecko__asset_platforms_list'\)/);
  assert.match(platformsSql, /id as raw_asset_platform_id/);
  assert.match(platformsSql, /nullif\(payload_jsonb ->> 'id', ''\) as asset_platform_id/);
});

test("dbt staging schema tests protect CoinGecko keys", () => {
  const spec = parse(readFileSync("transforms/models/staging/coingecko/_coingecko__models.yml", "utf8"));
  const [coinsModel, platformsModel] = spec.models;

  assert.equal(coinsModel.name, "stg__coins_list");
  assert.equal(platformsModel.name, "stg__asset_platforms_list");
  assert.equal(coinsModel.columns[0].name, "coin_id");
  assert.equal(platformsModel.columns[0].name, "asset_platform_id");
  assert.deepEqual(coinsModel.columns[0].tests, ["not_null", "unique"]);
  assert.deepEqual(platformsModel.columns[0].tests, ["not_null", "unique"]);
});
