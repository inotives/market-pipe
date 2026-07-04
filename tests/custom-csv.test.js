import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { getCustomCsvEntity, loadCustomCsvConfig } from "../dist/features/custom_csv/feature.js";
import { parseCustomCsv, stripUtf8Bom } from "../dist/features/custom_csv/parser.js";
import { features } from "../dist/features/index.js";

test("Custom CSV config contains the Phase 4 entity metadata", () => {
  const raw = parse(readFileSync("src/features/custom_csv/config.yaml", "utf8"));
  assert.deepEqual(raw.entities.map((entity) => entity.entity), [
    "CORESTICKM159SFRBATL",
    "PPIACO",
    "bitcoin_historical_ohlcv",
    "ethereum_historical_ohlcv",
  ]);

  const [coreCpi] = loadCustomCsvConfig().entities;
  assert.deepEqual(coreCpi, {
    entity: "CORESTICKM159SFRBATL",
    table: "custom_csv.raw_custom_csv__economic_time_series",
    parser: "economic_time_series",
    delimiter: ",",
    expectedHeaders: ["observation_date", "CORESTICKM159SFRBATL"],
    idFields: ["entity", "observation_date"],
  });

  assert.equal(getCustomCsvEntity("bitcoin_historical_ohlcv").asset, "bitcoin");
  assert.equal(getCustomCsvEntity("ethereum_historical_ohlcv").table, "custom_csv.raw_custom_csv__crypto_ohlcv");
});

test("feature registry includes the Custom CSV skeleton", () => {
  const customCsv = features.find((feature) => feature.slug === "custom-csv");
  assert.ok(customCsv);
  assert.equal(typeof customCsv.registerCommands, "function");
});

test("Custom CSV parser dispatch handles configured delimiters", () => {
  const economic = parseCustomCsv(
    "observation_date,PPIACO\n2024-01-01,123.4\n",
    getCustomCsvEntity("PPIACO"),
  );
  assert.deepEqual(economic, {
    headers: ["observation_date", "PPIACO"],
    rows: [{ observation_date: "2024-01-01", PPIACO: "123.4" }],
  });

  const crypto = parseCustomCsv(
    "timeOpen;timeClose;timeHigh;timeLow;name;open;high;low;close;volume;marketCap;circulatingSupply;timestamp\n1;2;3;4;Bitcoin;10;11;9;10.5;99;100;50;1704067200\n",
    getCustomCsvEntity("bitcoin_historical_ohlcv"),
  );
  assert.equal(crypto.rows[0].name, "Bitcoin");
  assert.equal(crypto.rows[0].timestamp, "1704067200");
});

test("Custom CSV parser strips a UTF-8 BOM before header validation", () => {
  assert.equal(stripUtf8Bom("\uFEFFobservation_date"), "observation_date");

  const parsed = parseCustomCsv(
    "\uFEFFobservation_date,CORESTICKM159SFRBATL\n2024-01-01,2.5\n",
    getCustomCsvEntity("CORESTICKM159SFRBATL"),
  );
  assert.deepEqual(parsed.headers, ["observation_date", "CORESTICKM159SFRBATL"]);
});

test("Custom CSV parser fails clearly on header mismatch", () => {
  assert.throws(
    () => parseCustomCsv("date,PPIACO\n2024-01-01,123.4\n", getCustomCsvEntity("PPIACO")),
    /CSV header mismatch: expected observation_date, PPIACO; received date, PPIACO/,
  );
});

test("Custom CSV parser includes the physical row number on column-count mismatch", () => {
  assert.throws(
    () => parseCustomCsv("observation_date,PPIACO\n2024-01-01\n", getCustomCsvEntity("PPIACO")),
    /CSV row 2 has 1 columns; expected 2/,
  );
});
