import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

test("dbt scaffold configures the market_pipe project", () => {
  const project = parse(readFileSync("transforms/dbt_project.yml", "utf8"));

  assert.equal(project.name, "market_pipe");
  assert.equal(project.profile, "market_pipe");
  assert.deepEqual(project["model-paths"], ["models"]);
  assert.equal(project.models.market_pipe["+materialized"], "view");
  assert.deepEqual(project["on-run-start"], [
    "drop view if exists staging.stg_coingecko__coins_list cascade",
    "drop view if exists staging.stg_coingecko__asset_platforms cascade",
    "drop view if exists marts.dim_coins cascade",
    "drop view if exists marts.dim_asset_platforms cascade",
  ]);
  assert.equal(project.models.market_pipe.staging.coingecko["+schema"], "coingecko");
  assert.equal(project.models.market_pipe.marts.coingecko["+schema"], "coingecko");
});

test("repo ignores local dbt runtime artifacts", () => {
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(gitignore, /^transforms\/\.dbt\/$/m);
  assert.match(gitignore, /^transforms\/target\/$/m);
  assert.match(gitignore, /^transforms\/dbt_packages\/$/m);
  assert.match(gitignore, /^transforms\/logs\/$/m);
});

test("README documents the external dbt-postgres runtime", () => {
  const readme = readFileSync("README.md", "utf8");

  assert.match(readme, /`dbt` is an external CLI dependency/i);
  assert.match(readme, /python -m pip install dbt-postgres/);
  assert.match(readme, /dbt run --project-dir transforms --profiles-dir transforms\/\.dbt/);
  assert.match(readme, /dbt test --project-dir transforms --profiles-dir transforms\/\.dbt/);
});

test("dbt project pins custom schemas to the documented names", () => {
  assert.equal(existsSync("transforms/macros/generate_schema_name.sql"), true);
  const macro = readFileSync("transforms/macros/generate_schema_name.sql", "utf8");

  assert.match(macro, /macro generate_schema_name/);
  assert.match(macro, /custom_schema_name \| trim/);
});
