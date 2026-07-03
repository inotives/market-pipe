import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { loadAlphaVantageConfig } from "../dist/features/alphavantage/feature.js";
import { features } from "../dist/features/index.js";

test("Alpha Vantage config contains the Phase 3 daily endpoint and symbol defaults", () => {
  const raw = parse(readFileSync("src/features/alphavantage/config.yaml", "utf8"));
  assert.deepEqual(raw.symbols, ["SPCX", "TSM", "MSFT", "GOOG", "NVDA"]);
  assert.equal(raw.quota.dailyRequestLimit, 25);
  assert.equal(raw.rateLimit.delayMs, 15000);

  const [daily] = loadAlphaVantageConfig().endpoints;
  assert.deepEqual(daily, {
    entity: "daily",
    function: "TIME_SERIES_DAILY",
    outputsize: "compact",
    table: "alphavantage.raw_alphavantage__daily_stock_ohlcv",
    idField: "symbol:observed_at",
  });
});

test("feature registry includes the Alpha Vantage skeleton", () => {
  const alphavantage = features.find((feature) => feature.slug === "alphavantage");
  assert.ok(alphavantage);
  assert.equal(typeof alphavantage.registerCommands, "function");
});
