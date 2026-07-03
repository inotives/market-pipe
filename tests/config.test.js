import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkConfig, getDatabaseUrl, loadEnv } from "../dist/config.js";

test("process env wins over .env.local", () => {
  const cwd = mkdtempSync(join(tmpdir(), "market-pipe-config-"));
  try {
    writeFileSync(join(cwd, ".env.local"), "MARKET_PIPE__COINGECKO_API_KEY=local\n");
    const env = loadEnv(cwd, { MARKET_PIPE__COINGECKO_API_KEY: "process" });
    assert.equal(env.MARKET_PIPE__COINGECKO_API_KEY, "process");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test(".env.local fills absent process env", () => {
  const cwd = mkdtempSync(join(tmpdir(), "market-pipe-config-"));
  try {
    writeFileSync(join(cwd, ".env.local"), "MARKET_PIPE__COINGECKO_API_KEY=local\n");
    const env = loadEnv(cwd, {});
    assert.equal(env.MARKET_PIPE__COINGECKO_API_KEY, "local");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test(".env is loaded for Compose parity", () => {
  const cwd = mkdtempSync(join(tmpdir(), "market-pipe-config-"));
  try {
    writeFileSync(join(cwd, ".env"), "MARKET_PIPE__POSTGRES_PORT=55432\n");
    const env = loadEnv(cwd, {});
    assert.equal(env.MARKET_PIPE__POSTGRES_PORT, "55432");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("config checks name missing variables", () => {
  assert.deepEqual(checkConfig("coingecko", {}).missing, ["MARKET_PIPE__COINGECKO_API_KEY"]);
  assert.deepEqual(checkConfig("alphavantage", {}).missing, ["MARKET_PIPE__ALPHAVANTAGE_API_KEY"]);
  assert.deepEqual(checkConfig("db", {}).missing, [
    "MARKET_PIPE__POSTGRES_HOST",
    "MARKET_PIPE__POSTGRES_PORT",
    "MARKET_PIPE__POSTGRES_DB",
    "MARKET_PIPE__POSTGRES_USER",
    "MARKET_PIPE__POSTGRES_PASSWORD",
  ]);
});

test("config checks CoinGecko retry values", () => {
  assert.deepEqual(
    checkConfig("coingecko", {
      MARKET_PIPE__COINGECKO_API_KEY: "demo",
      MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS: "0",
      MARKET_PIPE__COINGECKO_RETRY_BASE_MS: "nope",
    }).missing,
    ["MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS", "MARKET_PIPE__COINGECKO_RETRY_BASE_MS"],
  );
});

test("config checks CoinGecko paging values", () => {
  assert.deepEqual(
    checkConfig("coingecko", {
      MARKET_PIPE__COINGECKO_API_KEY: "demo",
      MARKET_PIPE__COINGECKO_PAGE_LIMIT: "0",
      MARKET_PIPE__COINGECKO_PER_PAGE: "-1",
    }).missing,
    ["MARKET_PIPE__COINGECKO_PAGE_LIMIT", "MARKET_PIPE__COINGECKO_PER_PAGE"],
  );
});

test("database url wins over split postgres fields", () => {
  assert.equal(getDatabaseUrl({ MARKET_PIPE__DATABASE_URL: "postgres://existing" }), "postgres://existing");
});

test("split postgres fields build a database url", () => {
  assert.equal(
    getDatabaseUrl({
      MARKET_PIPE__POSTGRES_HOST: "localhost",
      MARKET_PIPE__POSTGRES_PORT: "5432",
      MARKET_PIPE__POSTGRES_DB: "market_pipe",
      MARKET_PIPE__POSTGRES_USER: "market_pipe",
      MARKET_PIPE__POSTGRES_PASSWORD: "secret",
    }),
    "postgres://market_pipe:secret@localhost:5432/market_pipe",
  );
});
