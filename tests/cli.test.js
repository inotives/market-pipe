import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { test } from "node:test";

test("prints help for the planned command tree", () => {
  const output = execFileSync("node", ["dist/cli.js", "--help"], { encoding: "utf8" });

  assert.match(output, /Usage: market-pipe/);
  assert.match(output, /config/);
  assert.match(output, /db/);
  assert.match(output, /coingecko/);
  assert.match(output, /alphavantage/);
});

test("metadata-only CoinGecko entities fail before ingestion dispatch", () => {
  const result = spawnSync("node", ["dist/cli.js", "coingecko", "run", "--entity", "coins_id_history"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --id/);
  assert.equal(result.stdout, "");
});

test("pagination flags fail on entities that do not support them", () => {
  const result = spawnSync(
    "node",
    ["dist/cli.js", "coingecko", "run", "--entity", "coins_list", "--page-limit", "2"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not support pagination/);
});
