import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchAlphaVantageDaily,
  fetchAlphaVantageDailyForSymbols,
  prepareAlphaVantageRun,
  requestAlphaVantageDaily,
} from "../dist/features/alphavantage/client.js";

test("Alpha Vantage daily client builds TIME_SERIES_DAILY compact requests", async () => {
  let requestedUrl = "";
  const payload = { "Meta Data": { "2. Symbol": "MSFT" }, "Time Series (Daily)": {} };

  const result = await requestAlphaVantageDaily({
    apiKey: "demo",
    symbol: "MSFT",
    fetcher: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => payload,
      };
    },
  });

  assert.equal(
    requestedUrl,
    "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&outputsize=compact&apikey=demo",
  );
  assert.deepEqual(result, payload);
});

test("Alpha Vantage daily client preserves response payloads for caller handling", async () => {
  const payload = { Note: "Thank you for using Alpha Vantage!" };

  const result = await requestAlphaVantageDaily({
    apiKey: "demo",
    symbol: "MSFT",
    fetcher: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    }),
  });

  assert.deepEqual(result, payload);
});

test("Alpha Vantage real runs fail before HTTP when the API key is missing", async () => {
  let calls = 0;

  await assert.rejects(
    fetchAlphaVantageDaily(
      "MSFT",
      async () => {
        calls += 1;
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({}),
        };
      },
      { env: {} },
    ),
    /MARKET_PIPE__ALPHAVANTAGE_API_KEY/,
  );

  assert.equal(calls, 0);
});

test("Alpha Vantage quota guard fails before API requests", async () => {
  let calls = 0;
  const symbols = Array.from({ length: 26 }, (_, index) => `SYM${index}`);

  await assert.rejects(
    fetchAlphaVantageDailyForSymbols(
      symbols,
      async () => {
        calls += 1;
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({}),
        };
      },
      { env: { MARKET_PIPE__ALPHAVANTAGE_API_KEY: "demo" } },
    ),
    /exceeds quota\.dailyRequestLimit 25/,
  );

  assert.equal(calls, 0);
});

test("Alpha Vantage prepare run accepts planned symbols within quota", () => {
  assert.deepEqual(prepareAlphaVantageRun(["MSFT"], { MARKET_PIPE__ALPHAVANTAGE_API_KEY: "demo" }), { apiKey: "demo" });
});
