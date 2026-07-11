---
id: task-0034
title: "Phase 7: rename CoinGecko mart models and refs to source-owned relations"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-11
updated_on: 2026-07-11
priority: normal
parent: ""
depends_on:
  - task-0033
---

# Task

## Context

Phase 7 plan: `docs/phases/phase-07-production-scheduling.md`.

This task follows the staging rename. Once staging model identities and relations move to `coingecko.stg__<entity>`, marts must stop referencing the old Phase 6 staging names and adopt the new source-owned mart contract.

## Goal

Rename the CoinGecko mart dbt models and refs to the new source-owned contract and make them materialize as `coingecko.mart__<entity>`.

## Scope

- Rename the mart model identities from:
  - `dim_coins`
  - `dim_asset_platforms`
- Rename them to:
  - `mart__coins_list`
  - `mart__asset_platforms_list`
- Update mart SQL files, model YAML, and all `ref()` calls to use the renamed staging and mart models.
- Materialize those mart relations into the `coingecko` schema.
- Update repo tests that assert mart file names, model names, `ref()` usage, or mart relation names.
- Do not add compatibility views for the old `marts.dim_*` relations.

## Planner Notes

- Use the same strict source-entity mirroring as staging:
  - `coingecko.mart__coins_list`
  - `coingecko.mart__asset_platforms_list`
- Keep marts as narrow reference views; do not introduce an intermediate layer.
- This task should assume staging has already been renamed by `task-0033`.

## Implementation Plan

1. Rename the mart SQL files and YAML model names.
2. Update mart `ref()` calls to the new staging model identities.
3. Update schema routing/config needed so mart relations land in `coingecko`.
4. Update static tests to assert the renamed marts and refs.
5. Run typecheck and tests.

## Acceptance Criteria

- [ ] The mart dbt model identities are `mart__coins_list` and `mart__asset_platforms_list`.
- [ ] `dbt run --project-dir transforms --profiles-dir transforms/.dbt` materializes mart relations as `coingecko.mart__coins_list` and `coingecko.mart__asset_platforms_list`.
- [ ] Mart SQL references `ref('stg__coins_list')` and `ref('stg__asset_platforms_list')` or the exact renamed staging equivalents from `task-0033`.
- [ ] The old `dim_*` names are removed from repo tests and docs touched by this task.
- [ ] No intermediate model layer is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
