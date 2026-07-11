---
id: task-0035
title: "Phase 7: update dbt smoke coverage and docs for source-owned relations"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-11
updated_on: 2026-07-11
priority: normal
parent: ""
depends_on:
  - task-0034
---




# Task

## Context

Phase 7 plan: `docs/phases/phase-07-production-scheduling.md`.

This task closes the Phase 7 rename by proving the direct dbt workflow and the opt-in smoke path against the new `coingecko.*` relation contract, then aligning operator-facing docs.

## Goal

Update the dbt smoke path, README, and task notes so the repo proves and documents the new source-owned relation names end to end.

## Scope

- Update the opt-in dbt smoke test to query:
  - `coingecko.stg__coins_list`
  - `coingecko.stg__asset_platforms_list`
  - `coingecko.mart__coins_list`
  - `coingecko.mart__asset_platforms_list`
- Update README and any remaining operator docs that still mention `staging.*` or `marts.*` for the CoinGecko Phase 6/7 slice.
- Record one successful opt-in validation run in the task notes, using the project-local dbt environment approach already established in Phase 6.
- Keep direct `dbt run` and `dbt test` first-class in the docs.

## Planner Notes

- Default `npm test` should continue to skip the dbt smoke path when gates or `dbt` are unavailable.
- Do not require live CoinGecko API calls for this validation.
- Do not reintroduce compatibility language for the old generic-schema contract.

## Implementation Plan

1. Update the smoke test SQL verification queries to the new `coingecko.*` relations.
2. Update README and any remaining transform workflow docs to the new naming.
3. Run typecheck and default tests.
4. Run the opt-in dbt smoke once with local Postgres and project-local `dbt-postgres`.
5. Append the exact successful validation command and result summary to this task's notes.

## Acceptance Criteria

- [ ] Default `npm test` still skips dbt smoke when dbt/Postgres gates are unavailable.
- [ ] The opt-in smoke test verifies all four renamed `coingecko.*` staging and mart relations successfully.
- [ ] README and related operator docs remove the old `staging.*` and `marts.*` examples for this CoinGecko slice.
- [ ] Direct `dbt run --project-dir transforms --profiles-dir transforms/.dbt` and `dbt test --project-dir transforms --profiles-dir transforms/.dbt` remain documented.
- [ ] Task notes include one successful opt-in validation run summary against the renamed relations.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

- Worker validation:
  - `npm run typecheck`
  - `npm test`
  - `PATH="$PWD/.venv-dbt/bin:$PATH" MARKET_PIPE__RUN_DB_TESTS=1 MARKET_PIPE__RUN_DBT_SMOKE=1 npm test`
- Result:
  - Default `npm test` still skips the dbt smoke path when the dbt/Postgres gates are not enabled.
  - The opt-in smoke test verified all four renamed relations directly:
    - `coingecko.stg__coins_list`
    - `coingecko.stg__asset_platforms_list`
    - `coingecko.mart__coins_list`
    - `coingecko.mart__asset_platforms_list`
  - The same smoke also proved the legacy generic-schema views are removed after `dbt run`.
  - Successful opt-in run summary: `tests 103`, `pass 100`, `fail 0`, `skipped 3`.
