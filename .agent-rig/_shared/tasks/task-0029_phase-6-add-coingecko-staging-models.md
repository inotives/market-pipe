---
id: task-0029
title: "Phase 6: add CoinGecko staging models"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-10
priority: normal
parent: ""
depends_on:
  - task-0028
---






# Task

## Context

Phase 6 plan: `docs/phases/phase-06-dbt-transforms.md`.

Raw data remains ingestion-owned in `coingecko.*`; dbt staging models write views into the `staging` schema.

## Goal

Add dbt source declarations and staging views for CoinGecko `coins_list` and `asset_platforms_list`.

## Scope

- Declare dbt source `coingecko` with:
  - `raw_coingecko__coins_list`
  - `raw_coingecko__asset_platforms_list`
- Add staging views:
  - `staging.stg_coingecko__coins_list`
  - `staging.stg_coingecko__asset_platforms`
- Extract stable typed columns from `payload_jsonb`.
- Preserve source raw identity and warehouse timestamps where useful.
- Add schema tests for not-null and uniqueness on staging keys.
- Empty raw tables must pass tests.

## Planner Notes

- Keep JSON shaping in SQL, not TypeScript.
- Do not model other CoinGecko entities in Phase 6.
- Use dbt `source()` references so lineage is explicit.

## Implementation Plan

1. Add a dbt source YAML file for the two CoinGecko raw tables.
2. Add `stg_coingecko__coins_list.sql`.
3. Add `stg_coingecko__asset_platforms.sql`.
4. Add dbt data tests for not-null and unique keys.
5. Add default repo tests that inspect model/source files without needing a live dbt install.

## Acceptance Criteria

- [ ] dbt sources point at the two raw CoinGecko tables.
- [ ] `stg_coingecko__coins_list` uses `source('coingecko', 'raw_coingecko__coins_list')`.
- [ ] `stg_coingecko__asset_platforms` uses `source('coingecko', 'raw_coingecko__asset_platforms_list')`.
- [ ] Staging models materialize as views in `staging`.
- [ ] `coin_id` or equivalent staging key is not-null and unique for present rows.
- [ ] `asset_platform_id` or equivalent staging key is not-null and unique for present rows.
- [ ] Empty raw tables do not fail dbt tests.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

- Reviewer 2026-07-10 (codex):
  - Root cause: `stg_coingecko__asset_platforms` aliases the warehouse raw `id` column to `asset_platform_id`, while the typed CoinGecko id extracted from `payload_jsonb` is exposed as `platform_id`. The schema test then enforces `not_null` and `unique` on the raw warehouse id instead of the staging key described by the task.
  - Expected: the staging key should be the stable typed CoinGecko platform id extracted from `payload_jsonb`, with the raw warehouse identity preserved separately when useful.
  - Actual: [transforms/models/staging/coingecko/stg_coingecko__asset_platforms.sql](/Users/inotives/workspaces/market-pipe/transforms/models/staging/coingecko/stg_coingecko__asset_platforms.sql:2) sets `asset_platform_id` from raw `id`, and [transforms/models/staging/coingecko/_coingecko__models.yml](/Users/inotives/workspaces/market-pipe/transforms/models/staging/coingecko/_coingecko__models.yml:19) tests that raw id column.
  - Smallest fix: rename the extracted `payload_jsonb ->> 'id'` column to the staging key name you want to guarantee (`asset_platform_id` is the obvious choice), keep the raw warehouse id under a separate `raw_*` name, and update [tests/dbt-staging.test.js](/Users/inotives/workspaces/market-pipe/tests/dbt-staging.test.js:25) so it asserts the schema test is attached to the typed key rather than the raw row id.
