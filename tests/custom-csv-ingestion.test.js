import assert from "node:assert/strict";
import { mkdtempSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { test } from "node:test";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import {
  extractCustomCsvRows,
  ingestCustomCsvRows,
  runCustomCsvCryptoOhlcv,
  runCustomCsvEconomicTimeSeries,
} from "../dist/features/custom_csv/runner.js";

async function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "market-pipe-custom-csv-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("economic time-series fixture files parse and validate", async () => {
  await withTempDir(async (dir) => {
    const corePath = join(dir, "CORESTICKM159SFRBATL.csv");
    const ppiPath = join(dir, "PPIACO.csv");
    writeFileSync(corePath, "observation_date,CORESTICKM159SFRBATL\n2024-01-01,2.5\n2024-02-01,2.6\n");
    writeFileSync(ppiPath, "observation_date,PPIACO\n2024-01-01,123.4\n2024-02-01,124.1\n");

    assert.deepEqual(extractCustomCsvRows("CORESTICKM159SFRBATL", corePath).map((row) => row.id), [
      "CORESTICKM159SFRBATL:2024-01-01",
      "CORESTICKM159SFRBATL:2024-02-01",
    ]);
    assert.deepEqual(extractCustomCsvRows("PPIACO", ppiPath).map((row) => row.id), [
      "PPIACO:2024-01-01",
      "PPIACO:2024-02-01",
    ]);
  });
});

test("economic time-series validation fails with useful row numbers", async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, "PPIACO.csv");
    writeFileSync(filePath, "observation_date,PPIACO\n2024-01-01,123.4\n2024-02-01,\n");

    assert.throws(
      () => extractCustomCsvRows("PPIACO", filePath),
      /Custom CSV PPIACO row 3 is missing PPIACO/,
    );
  });
});

test("economic time-series duplicate ids fail before DB writes", async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, "CORESTICKM159SFRBATL.csv");
    writeFileSync(filePath, "observation_date,CORESTICKM159SFRBATL\n2024-01-01,2.5\n2024-01-01,2.6\n");

    assert.throws(
      () => extractCustomCsvRows("CORESTICKM159SFRBATL", filePath),
      /Custom CSV duplicate id in file: CORESTICKM159SFRBATL:2024-01-01/,
    );
  });
});

test("economic time-series raw landing is idempotent and ignores csv_path in row identity", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempDir(async (dir) => {
    const originalPath = join(dir, "PPIACO.csv");
    const movedPath = join(dir, "renamed-PPIACO.csv");
    writeFileSync(originalPath, "observation_date,PPIACO\n2024-01-01,123.4\n2024-02-01,124.1\n");

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("delete from custom_csv.raw_custom_csv__economic_time_series where id in ('PPIACO:2024-01-01', 'PPIACO:2024-02-01')");
    } finally {
      await client.end();
    }

    await runCustomCsvEconomicTimeSeries("PPIACO", originalPath);

    renameSync(originalPath, movedPath);
    writeFileSync(movedPath, "observation_date,PPIACO\n2024-01-01,999.9\n2024-02-01,124.1\n");
    await new Promise((resolve) => setTimeout(resolve, 5));
    utimesSync(movedPath, new Date(), new Date());

    await runCustomCsvEconomicTimeSeries("PPIACO", movedPath);

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(`
        select id, entity, csv_path, header_shape, row_data, updated_at
        from custom_csv.raw_custom_csv__economic_time_series
        where id in ('PPIACO:2024-01-01', 'PPIACO:2024-02-01')
        order by id
      `);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows[0].id, "PPIACO:2024-01-01");
      assert.equal(result.rows[0].entity, "PPIACO");
      assert.equal(result.rows[0].row_data.PPIACO, "999.9");
      assert.equal(result.rows[0].csv_path, movedPath);
      assert.deepEqual(result.rows[0].header_shape, ["observation_date", "PPIACO"]);
      assert.equal(result.rows[1].id, "PPIACO:2024-02-01");
      assert.equal(result.rows[1].entity, "PPIACO");
      assert.equal(result.rows[1].csv_path, movedPath);
      assert.ok(result.rows[0].updated_at);
      assert.ok(result.rows[1].updated_at);
    } finally {
      await verify.end();
    }
  });
});

test("economic time-series invalid files fail before DB writes", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempDir(async (dir) => {
    const filePath = join(dir, "CORESTICKM159SFRBATL.csv");
    writeFileSync(filePath, "observation_date,CORESTICKM159SFRBATL\n2024-01-01,2.5\n2024-02-01,\n");

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("delete from custom_csv.raw_custom_csv__economic_time_series where id like 'CORESTICKM159SFRBATL:%'");
    } finally {
      await client.end();
    }

    await assert.rejects(
      runCustomCsvEconomicTimeSeries("CORESTICKM159SFRBATL", filePath),
      /Custom CSV CORESTICKM159SFRBATL row 3 is missing CORESTICKM159SFRBATL/,
    );

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(
        "select count(*)::int as count from custom_csv.raw_custom_csv__economic_time_series where id like 'CORESTICKM159SFRBATL:%'",
      );
      assert.equal(result.rows[0].count, 0);
    } finally {
      await verify.end();
    }
  });
});

test("economic time-series raw upsert writes into the custom_csv economic table", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempDir(async (dir) => {
    const filePath = join(dir, "CORESTICKM159SFRBATL.csv");
    writeFileSync(filePath, "observation_date,CORESTICKM159SFRBATL\n2024-01-01,2.5\n");

    const rows = extractCustomCsvRows("CORESTICKM159SFRBATL", filePath);
    await ingestCustomCsvRows("CORESTICKM159SFRBATL", rows, connectionString);

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(`
        select id, entity, csv_path, header_shape, row_data
        from custom_csv.raw_custom_csv__economic_time_series
        where id = 'CORESTICKM159SFRBATL:2024-01-01'
      `);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].entity, "CORESTICKM159SFRBATL");
      assert.equal(result.rows[0].csv_path, filePath);
      assert.deepEqual(result.rows[0].header_shape, ["observation_date", "CORESTICKM159SFRBATL"]);
      assert.equal(result.rows[0].row_data.CORESTICKM159SFRBATL, "2.5");
    } finally {
      await verify.end();
    }
  });
});

test("crypto OHLCV fixture files parse and validate, including BOM-prefixed headers", async () => {
  await withTempDir(async (dir) => {
    const bitcoinPath = join(dir, "bitcoin-historical-ohlcv.csv");
    const ethereumPath = join(dir, "ethereum-historical-ohlcv.csv");
    const header = "\uFEFFtimeOpen;timeClose;timeHigh;timeLow;name;open;high;low;close;volume;marketCap;circulatingSupply;timestamp";
    writeFileSync(
      bitcoinPath,
      `${header}\n2024-01-01T00:00:00Z;2024-01-01T23:59:59Z;2024-01-01T12:00:00Z;2024-01-01T06:00:00Z;Bitcoin;10;11;9;10.5;99;100;50;1704067200\n`,
    );
    writeFileSync(
      ethereumPath,
      `${header}\n2024-01-01T00:00:00Z;2024-01-01T23:59:59Z;2024-01-01T12:00:00Z;2024-01-01T06:00:00Z;Ethereum;20;21;19;20.5;199;200;150;1704067201\n`,
    );

    const bitcoinRows = extractCustomCsvRows("bitcoin_historical_ohlcv", bitcoinPath);
    const ethereumRows = extractCustomCsvRows("ethereum_historical_ohlcv", ethereumPath);

    assert.equal(bitcoinRows[0].id, "bitcoin_historical_ohlcv:1704067200");
    assert.equal(bitcoinRows[0].rowData.asset, "bitcoin");
    assert.equal(bitcoinRows[0].rowData.name, "Bitcoin");
    assert.equal(ethereumRows[0].id, "ethereum_historical_ohlcv:1704067201");
    assert.equal(ethereumRows[0].rowData.asset, "ethereum");
    assert.equal(ethereumRows[0].rowData.name, "Ethereum");
  });
});

test("crypto OHLCV duplicate ids fail before DB writes", async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, "bitcoin-historical-ohlcv.csv");
    writeFileSync(
      filePath,
      "\uFEFFtimeOpen;timeClose;timeHigh;timeLow;name;open;high;low;close;volume;marketCap;circulatingSupply;timestamp\n"
        + "2024-01-01T00:00:00Z;2024-01-01T23:59:59Z;2024-01-01T12:00:00Z;2024-01-01T06:00:00Z;Bitcoin;10;11;9;10.5;99;100;50;1704067200\n"
        + "2024-01-02T00:00:00Z;2024-01-02T23:59:59Z;2024-01-02T12:00:00Z;2024-01-02T06:00:00Z;Bitcoin;12;13;11;12.5;109;110;60;1704067200\n",
    );

    assert.throws(
      () => extractCustomCsvRows("bitcoin_historical_ohlcv", filePath),
      /Custom CSV duplicate id in file: bitcoin_historical_ohlcv:1704067200/,
    );
  });
});

test("crypto OHLCV raw landing includes configured asset metadata and is idempotent", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempDir(async (dir) => {
    const filePath = join(dir, "bitcoin-historical-ohlcv.csv");
    writeFileSync(
      filePath,
      "\uFEFFtimeOpen;timeClose;timeHigh;timeLow;name;open;high;low;close;volume;marketCap;circulatingSupply;timestamp\n"
        + "2024-01-01T00:00:00Z;2024-01-01T23:59:59Z;2024-01-01T12:00:00Z;2024-01-01T06:00:00Z;Bitcoin;10;11;9;10.5;99;100;50;1704067200\n",
    );

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("delete from custom_csv.raw_custom_csv__crypto_ohlcv where id = 'bitcoin_historical_ohlcv:1704067200'");
    } finally {
      await client.end();
    }

    await runCustomCsvCryptoOhlcv("bitcoin_historical_ohlcv", filePath);
    writeFileSync(
      filePath,
      "\uFEFFtimeOpen;timeClose;timeHigh;timeLow;name;open;high;low;close;volume;marketCap;circulatingSupply;timestamp\n"
        + "2024-01-01T00:00:00Z;2024-01-01T23:59:59Z;2024-01-01T12:00:00Z;2024-01-01T06:00:00Z;Bitcoin;10;12;9;11.5;199;200;60;1704067200\n",
    );
    await runCustomCsvCryptoOhlcv("bitcoin_historical_ohlcv", filePath);

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(`
        select id, entity, csv_path, header_shape, row_data
        from custom_csv.raw_custom_csv__crypto_ohlcv
        where id = 'bitcoin_historical_ohlcv:1704067200'
      `);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].entity, "bitcoin_historical_ohlcv");
      assert.equal(result.rows[0].csv_path, filePath);
      assert.equal(result.rows[0].row_data.asset, "bitcoin");
      assert.equal(result.rows[0].row_data.high, "12");
      assert.deepEqual(result.rows[0].header_shape, [
        "timeOpen",
        "timeClose",
        "timeHigh",
        "timeLow",
        "name",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "marketCap",
        "circulatingSupply",
        "timestamp",
      ]);
    } finally {
      await verify.end();
    }
  });
});
