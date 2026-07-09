---
id: task-0032
title: "Phase 6: add dbt smoke tests and docs"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0031
---

# Task

## Context

Phase 6 plan: `docs/phases/phase-06-dbt-transforms.md`.

This task closes Phase 6 by proving direct dbt usage and documenting the workflow.

## Goal

Add opt-in dbt smoke coverage and final docs for Phase 6 transform usage.

## Scope

- Add an opt-in DB/dbt smoke test.
- Gate the smoke test on local Postgres and installed `dbt`.
- Bootstrap raw tables and insert minimal CoinGecko raw rows for `coins_list` and `asset_platforms_list`.
- Generate the project-local profile.
- Run direct dbt commands:
  - `dbt run --project-dir transforms --profiles-dir transforms/.dbt`
  - `dbt test --project-dir transforms --profiles-dir transforms/.dbt`
- Verify `staging` and `marts` views can be queried.
- Update README with install, profile generation, direct dbt commands, and thin `market-pipe transform` helpers.
- Mark Phase 6 tasks done only after checks pass.

## Planner Notes

- Default `npm test` should skip the smoke test unless env gates and dbt are available.
- Do not require live CoinGecko API calls for dbt smoke coverage.
- Empty raw tables should still be allowed outside this smoke fixture.

## Implementation Plan

1. Add opt-in dbt smoke test using deterministic inserted raw rows.
2. Verify direct `dbt run` and `dbt test`.
3. Query `staging.stg_coingecko__coins_list`, `staging.stg_coingecko__asset_platforms`, `marts.dim_coins`, and `marts.dim_asset_platforms`.
4. Update README and Phase 6 task notes with validation results.
5. Run typecheck, default tests, and opt-in dbt smoke when available.

## Acceptance Criteria

- [ ] Default `npm test` skips dbt smoke when dbt/Postgres gates are unavailable.
- [ ] Opt-in smoke inserts deterministic raw CoinGecko fixture rows.
- [ ] Direct `dbt run` succeeds with project-local profile.
- [ ] Direct `dbt test` succeeds with project-local profile.
- [ ] Staging views query successfully.
- [ ] Mart views query successfully.
- [ ] README documents direct dbt commands and `market-pipe transform` helpers.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

