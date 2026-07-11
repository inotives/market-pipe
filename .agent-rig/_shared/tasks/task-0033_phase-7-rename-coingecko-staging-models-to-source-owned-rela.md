---
id: task-0033
title: "Phase 7: rename CoinGecko staging models to source-owned relations"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-11
updated_on: 2026-07-11
priority: normal
parent: ""
depends_on: []
---

# Task

## Context

Phase 7 plan: `docs/phases/phase-07-production-scheduling.md`.

Phase 6 proved the CoinGecko dbt slice, but it materialized staging models into the generic `staging` schema and used Phase 6-specific `stg_coingecko__*` model identities. Phase 7 replaces that contract with source-owned naming.

## Goal

Rename the CoinGecko staging dbt models to the new source-owned contract and make them materialize as `coingecko.stg__<entity>`.

## Scope

- Rename the staging model identities from:
  - `stg_coingecko__coins_list`
  - `stg_coingecko__asset_platforms`
- Rename them to:
  - `stg__coins_list`
  - `stg__asset_platforms_list`
- Materialize those staging relations into the `coingecko` schema.
- Update the staging model SQL files, model YAML, and schema routing/config needed for the staging rename.
- Keep raw sources unchanged:
  - `coingecko.raw_coingecko__coins_list`
  - `coingecko.raw_coingecko__asset_platforms_list`
- Update repo tests that assert staging model file names, model names, or staging relation names.
- Do not change mart model names in this task.

## Planner Notes

- This is a breaking warehouse contract change; do not preserve `staging.*` compatibility names.
- Use strict source-entity mirroring:
  - `coingecko.stg__coins_list`
  - `coingecko.stg__asset_platforms_list`
- Keep all models as views.
- Keep direct `dbt` commands first-class.

## Implementation Plan

1. Update dbt model naming/config for the CoinGecko staging subtree.
2. Rename the two staging SQL files and model YAML entries.
3. Ensure staging still reads from the existing `source('coingecko', ...)` declarations.
4. Update static tests and any smoke-test staging relation references to the new names where needed for this slice.
5. Run typecheck and tests.

## Acceptance Criteria

- [ ] The staging dbt model identities are `stg__coins_list` and `stg__asset_platforms_list`.
- [ ] `dbt run --project-dir transforms --profiles-dir transforms/.dbt` materializes staging relations as `coingecko.stg__coins_list` and `coingecko.stg__asset_platforms_list`.
- [ ] The raw `coingecko` sources remain unchanged.
- [ ] Staging model SQL still reads from explicit `source('coingecko', ...)` references.
- [ ] The old `stg_coingecko__*` names are removed from repo tests and docs touched by this task.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
