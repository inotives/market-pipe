---
id: task-0029
title: "Phase 6: add CoinGecko staging models"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
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

