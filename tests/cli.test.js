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
  assert.match(output, /custom-csv/);
  assert.match(output, /agent-local/);
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

test("custom-csv run requires --entity", () => {
  const result = spawnSync("node", ["dist/cli.js", "custom-csv", "run", "--file", "/tmp/demo.csv"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /required option '--entity <entity>' not specified/);
});

test("custom-csv run requires --file", () => {
  const result = spawnSync("node", ["dist/cli.js", "custom-csv", "run", "--entity", "PPIACO"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /required option '--file <path>' not specified/);
});

test("custom-csv run rejects remote URLs clearly", () => {
  const result = spawnSync(
    "node",
    ["dist/cli.js", "custom-csv", "run", "--entity", "PPIACO", "--file", "https://example.com/PPIACO.csv"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /only supports local filesystem paths/);
});

test("agent-local run requires either --project or --all", () => {
  const result = spawnSync("node", ["dist/cli.js", "agent-local", "run"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires exactly one of --project or --all/);
});

test("agent-local run rejects --project with --all", () => {
  const result = spawnSync("node", ["dist/cli.js", "agent-local", "run", "--project", "agent-pipe", "--all"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires exactly one of --project or --all/);
});

test("agent-local run rejects unknown configured projects before sqlite access", () => {
  const result = spawnSync("node", ["dist/cli.js", "agent-local", "run", "--project", "unknown-project"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported Agent Local project: unknown-project/);
});

test("agent-local run accepts --project with --entity", () => {
  const result = spawnSync(
    "node",
    ["dist/cli.js", "agent-local", "run", "--project", "agent-pipe", "--entity", "rates"],
    { encoding: "utf8", env: { ...process.env, MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: "/tmp/missing.sqlite" } },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Agent Local SQLite file does not exist:/);
});

test("agent-local run accepts --all", () => {
  const result = spawnSync(
    "node",
    ["dist/cli.js", "agent-local", "run", "--all"],
    { encoding: "utf8", env: { ...process.env, MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: "/tmp/missing.sqlite" } },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Agent Local SQLite file does not exist:/);
});
