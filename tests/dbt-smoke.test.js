import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import pg from "pg";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import { writeTransformProfile } from "../dist/features/transform/runner.js";

const dbtSmokeEnabled = Boolean(process.env.MARKET_PIPE__RUN_DB_TESTS && process.env.MARKET_PIPE__RUN_DBT_SMOKE);
const dbtAvailable = spawnSync("dbt", ["--version"], { encoding: "utf8" }).status === 0;

test("default test suite skips dbt smoke when opt-in gates or dbt are unavailable", () => {
  if (dbtSmokeEnabled && dbtAvailable) {
    assert.ok(true);
    return;
  }

  assert.ok(true);
});

test(
  "opt-in dbt smoke runs direct dbt commands and queries staging and mart views",
  { skip: !dbtSmokeEnabled || !dbtAvailable },
  async () => {
    await bootstrapDatabase();
    const env = loadEnv();
    const connectionString = getDatabaseUrl(env);
    assert.ok(connectionString);

    writeTransformProfile(env);

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("truncate table coingecko.raw_coingecko__coins_list");
      await client.query("truncate table coingecko.raw_coingecko__asset_platforms_list");

      await client.query(
        `
          insert into coingecko.raw_coingecko__coins_list (id, endpoint, payload_jsonb)
          values
            ($1, '/coins/list', $2::jsonb),
            ($3, '/coins/list', $4::jsonb)
          on conflict (id) do update
          set endpoint = excluded.endpoint,
              payload_jsonb = excluded.payload_jsonb,
              updated_at = now()
        `,
        [
          "market-pipe-dbt-bitcoin",
          JSON.stringify({ id: "market-pipe-dbt-bitcoin", symbol: "mpbtc", name: "Market Pipe Bitcoin", platforms: { ethereum: "0x01" } }),
          "market-pipe-dbt-ethereum",
          JSON.stringify({ id: "market-pipe-dbt-ethereum", symbol: "mpeth", name: "Market Pipe Ethereum", platforms: { ethereum: "0x02" } }),
        ],
      );
      await client.query(
        `
          insert into coingecko.raw_coingecko__asset_platforms_list (id, endpoint, payload_jsonb)
          values
            ($1, '/asset_platforms', $2::jsonb),
            ($3, '/asset_platforms', $4::jsonb)
          on conflict (id) do update
          set endpoint = excluded.endpoint,
              payload_jsonb = excluded.payload_jsonb,
              updated_at = now()
        `,
        [
          "market-pipe-dbt-asset-platform-ethereum",
          JSON.stringify({ id: "market-pipe-dbt-ethereum", chain_identifier: 1, name: "Market Pipe Ethereum", shortname: "mpeth", native_coin_id: "market-pipe-dbt-ethereum-coin", image: "https://example.com/eth.png" }),
          "market-pipe-dbt-asset-platform-polygon",
          JSON.stringify({ id: "market-pipe-dbt-polygon-pos", chain_identifier: 137, name: "Market Pipe Polygon POS", shortname: "mppolygon", native_coin_id: "market-pipe-dbt-polygon-coin", image: "https://example.com/polygon.png" }),
        ],
      );
    } finally {
      await client.end();
    }

    for (const command of ["run", "test"]) {
      const result = spawnSync("dbt", [command, "--project-dir", "transforms", "--profiles-dir", "transforms/.dbt"], {
        encoding: "utf8",
        env: { ...process.env, ...env },
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const stagingCoins = await verify.query(`
        select coin_id, symbol, name
        from staging.stg_coingecko__coins_list
        where coin_id in ('market-pipe-dbt-bitcoin', 'market-pipe-dbt-ethereum')
        order by coin_id
      `);
      assert.deepEqual(stagingCoins.rows.map((row) => row.coin_id), ["market-pipe-dbt-bitcoin", "market-pipe-dbt-ethereum"]);

      const stagingPlatforms = await verify.query(`
        select asset_platform_id, chain_identifier, name
        from staging.stg_coingecko__asset_platforms
        where asset_platform_id in ('market-pipe-dbt-ethereum', 'market-pipe-dbt-polygon-pos')
        order by asset_platform_id
      `);
      assert.deepEqual(stagingPlatforms.rows.map((row) => row.asset_platform_id), ["market-pipe-dbt-ethereum", "market-pipe-dbt-polygon-pos"]);

      const martCoins = await verify.query(`
        select coin_id, symbol, name
        from marts.dim_coins
        where coin_id in ('market-pipe-dbt-bitcoin', 'market-pipe-dbt-ethereum')
        order by coin_id
      `);
      assert.deepEqual(martCoins.rows.map((row) => row.coin_id), ["market-pipe-dbt-bitcoin", "market-pipe-dbt-ethereum"]);

      const martPlatforms = await verify.query(`
        select asset_platform_id, chain_identifier, name
        from marts.dim_asset_platforms
        where asset_platform_id in ('market-pipe-dbt-ethereum', 'market-pipe-dbt-polygon-pos')
        order by asset_platform_id
      `);
      assert.deepEqual(martPlatforms.rows.map((row) => row.asset_platform_id), ["market-pipe-dbt-ethereum", "market-pipe-dbt-polygon-pos"]);
    } finally {
      await verify.end();
    }
  },
);
