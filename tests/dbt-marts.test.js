import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

test("dbt mart models reference the Phase 7 staging models", () => {
  const coinsSql = readFileSync("transforms/models/marts/coingecko/mart__coins_list.sql", "utf8");
  const platformsSql = readFileSync("transforms/models/marts/coingecko/mart__asset_platforms_list.sql", "utf8");

  assert.match(coinsSql, /ref\('stg__coins_list'\)/);
  assert.match(platformsSql, /ref\('stg__asset_platforms_list'\)/);
});

test("dbt mart schema tests protect dimension keys", () => {
  const spec = parse(readFileSync("transforms/models/marts/coingecko/_coingecko__marts.yml", "utf8"));
  const [coinsModel, platformsModel] = spec.models;

  assert.equal(coinsModel.name, "mart__coins_list");
  assert.equal(platformsModel.name, "mart__asset_platforms_list");
  assert.equal(coinsModel.columns[0].name, "coin_id");
  assert.deepEqual(coinsModel.columns[0].tests, ["not_null", "unique"]);
  assert.equal(platformsModel.columns[0].name, "asset_platform_id");
  assert.deepEqual(platformsModel.columns[0].tests, ["not_null", "unique"]);
});

test("Phase 6 does not introduce an intermediate dbt layer", () => {
  assert.equal(existsSync("transforms/models/intermediate"), false);
});
