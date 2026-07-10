---
id: task-0032
title: "Phase 6: add dbt smoke tests and docs"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-10
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

- Reviewer 2026-07-10 (codex):
  - Root cause: the repo now has the opt-in smoke test and README workflow, but the task still lacks any validation evidence that the gated smoke actually passed with installed `dbt` and local Postgres.
  - Expected: because this task closes Phase 6, the task notes should record one successful opt-in run proving `dbt run`, `dbt test`, and the staging/mart queries all passed.
  - Actual: the notes are empty, and in this reviewer environment `dbt` is not installed (`spawnSync dbt ENOENT`), so I could only verify the default skip path from [tests/dbt-smoke.test.js](/Users/inotives/workspaces/market-pipe/tests/dbt-smoke.test.js:21) plus `npm run typecheck` and `npm test`.
  - Smallest fix: run the documented opt-in smoke once in a local environment with `dbt` and Postgres available, then append the exact command and successful result summary here before sending the task back to review.

- Reviewer follow-up 2026-07-10 (codex):
  - Human preference: use an isolated local Python environment for dbt instead of installing it globally.
  - Worker direction: set up a project-local dbt environment with `uv` and a local virtual environment, install `dbt-postgres` there, run the opt-in smoke through that isolated setup, and record the exact commands plus success evidence in these notes before returning the task to review.

- Worker validation 2026-07-10 (codex):
  - Local isolated dbt setup:
    - `UV_CACHE_DIR=.uv-cache python3 -m uv venv .venv-dbt`
    - `.venv-dbt/bin/python -m ensurepip --upgrade`
    - `.venv-dbt/bin/python -m pip install dbt-postgres`
  - Local Postgres startup: `docker compose up -d postgres`
  - Successful opt-in smoke command:
    - `PATH="/Users/inotives/workspaces/market-pipe/.venv-dbt/bin:$PATH" MARKET_PIPE__RUN_DB_TESTS=1 MARKET_PIPE__RUN_DBT_SMOKE=1 npm test`
  - Successful result summary:
    - dbt 1.12.0-rc2 from the project-local `.venv-dbt` executed the direct `dbt run --project-dir transforms --profiles-dir transforms/.dbt` and `dbt test --project-dir transforms --profiles-dir transforms/.dbt` path through [tests/dbt-smoke.test.js](/Users/inotives/workspaces/market-pipe/tests/dbt-smoke.test.js).
    - The opt-in smoke test passed and queried all four documented Phase 6 relations successfully: `staging.stg_coingecko__coins_list`, `staging.stg_coingecko__asset_platforms`, `marts.dim_coins`, and `marts.dim_asset_platforms`.
    - Full opt-in run result: `tests 103`, `pass 100`, `fail 0`, `skipped 3`.
