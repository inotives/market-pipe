import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

test("dbt mart models reference the Phase 6 staging models", () => {
  const coinsSql = readFileSync("transforms/models/marts/coingecko/dim_coins.sql", "utf8");
  const platformsSql = readFileSync("transforms/models/marts/coingecko/dim_asset_platforms.sql", "utf8");

  assert.match(coinsSql, /ref\('stg_coingecko__coins_list'\)/);
  assert.match(platformsSql, /ref\('stg_coingecko__asset_platforms'\)/);
});

test("dbt mart schema tests protect dimension keys", () => {
  const spec = parse(readFileSync("transforms/models/marts/coingecko/_coingecko__marts.yml", "utf8"));
  const [coinsModel, platformsModel] = spec.models;

  assert.equal(coinsModel.columns[0].name, "coin_id");
  assert.deepEqual(coinsModel.columns[0].tests, ["not_null", "unique"]);
  assert.equal(platformsModel.columns[0].name, "asset_platform_id");
  assert.deepEqual(platformsModel.columns[0].tests, ["not_null", "unique"]);
});

test("Phase 6 does not introduce an intermediate dbt layer", () => {
  assert.equal(existsSync("transforms/models/intermediate"), false);
});
