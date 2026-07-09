# Phase 6 - dbt Transforms

## Purpose

Add queryable models over raw CoinGecko data while keeping SQL transforms out of TypeScript.

dbt appears only after raw data is landing reliably. Phase 6 proves the transform contract with the smallest useful slice:

```text
raw -> staging -> marts
```

Direct `dbt` commands are first-class. `market-pipe transform ...` commands are thin convenience helpers for profile generation and orchestration parity.

## Scope

- dbt project under `transforms/`.
- CoinGecko-only first slice.
- Staging views for:
  - `coingecko.raw_coingecko__coins_list`
  - `coingecko.raw_coingecko__asset_platforms_list`
- Reference mart views for:
  - coins
  - asset platforms
- dbt source declarations for the two raw CoinGecko tables.
- dbt tests for not-null keys and duplicate grains.
- Project-local profile generation from `MARKET_PIPE__DATABASE_URL`.
- Direct dbt usage:
  - `dbt run --project-dir transforms --profiles-dir transforms/.dbt`
  - `dbt test --project-dir transforms --profiles-dir transforms/.dbt`
- Thin CLI helpers:
  - `market-pipe transform profile`
  - `market-pipe transform run`
  - `market-pipe transform test`

## Transform Layers

Raw data remains ingestion-owned in source schemas:

```text
coingecko.raw_coingecko__coins_list
coingecko.raw_coingecko__asset_platforms_list
```

dbt writes staging views into the `staging` schema:

```text
staging.stg_coingecko__coins_list
staging.stg_coingecko__asset_platforms
```

dbt writes mart views into the `marts` schema:

```text
marts.dim_coins
marts.dim_asset_platforms
```

No `intermediate` schema or models are created in Phase 6. Add the intermediate layer only when multiple staging models need reusable business logic.

All Phase 6 models are views. Tables, incremental models, and refresh policy are deferred.

## dbt Runtime

`dbt` is an external CLI dependency, not an npm package dependency.

Install guidance should recommend a Python-based `dbt-postgres` install, such as:

```bash
python -m pip install dbt-postgres
```

or the local project equivalent using the team's preferred Python environment tool.

If `dbt` is missing, `market-pipe transform run` and `market-pipe transform test` fail clearly with install guidance. `market-pipe` must not auto-install Python packages.

`market-pipe transform profile` writes `transforms/.dbt/profiles.yml` from `MARKET_PIPE__DATABASE_URL`. The profile directory is project-local so direct dbt commands can reuse it without mutating `~/.dbt`.

## Out Of Scope

- Alpha Vantage models.
- Custom CSV models.
- Agent Local models.
- CoinGecko `trending_search`, `crypto_global`, `derivatives_exchanges`, `exchanges`, `coins_categories`, `coins_id_history`, and `coins_id_ohlc` transforms.
- Intermediate models.
- Incremental models.
- Persisted table materializations.
- Full warehouse modeling framework.
- Dashboard-specific marts.
- dbt docs site generation.
- dbt semantic layer.
- Production scheduling.
- Auto-installing dbt.
- TypeScript data shaping that belongs in SQL.

## Acceptance Signals

- `transforms/dbt_project.yml` defines a valid dbt project.
- dbt source declarations point at the two raw CoinGecko tables.
- `dbt run --project-dir transforms --profiles-dir transforms/.dbt` builds Phase 6 models.
- `dbt test --project-dir transforms --profiles-dir transforms/.dbt` runs Phase 6 tests.
- `market-pipe transform profile` generates `transforms/.dbt/profiles.yml` from `MARKET_PIPE__DATABASE_URL`.
- `market-pipe transform run` shells out to `dbt run` with the project-local profile.
- `market-pipe transform test` shells out to `dbt test` with the project-local profile.
- Missing `dbt` fails with clear install guidance.
- Empty raw tables do not fail dbt tests.
- dbt tests catch null keys for present rows.
- dbt tests catch duplicate grains for present rows.
- The staging views expose stable typed columns for coins and asset platforms.
- The mart views expose stable reference dimensions for coins and asset platforms.
- `npm run typecheck` passes.
- `npm test` passes.

## Open Decisions

- None for Phase 6 implementation.
