---
id: task-0030
title: "Phase 6: add CoinGecko reference mart models"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0029
---

# Task

## Context

Phase 6 plan: `docs/phases/phase-06-dbt-transforms.md`.

Phase 6 creates reference marts only. No intermediate layer is needed yet.

## Goal

Add mart views for CoinGecko coins and asset platforms.

## Scope

- Add mart views:
  - `marts.dim_coins`
  - `marts.dim_asset_platforms`
- Build marts from the Phase 6 staging models.
- Add mart tests for not-null and unique keys.
- Keep marts as views.
- Do not create `intermediate` schema/models.

## Planner Notes

- Do not force a wide joined coin/platform mart in this phase.
- These are reference dimensions, not dashboard-specific marts.
- Keep model names exactly as documented unless implementation reveals a dbt naming constraint.

## Implementation Plan

1. Add `dim_coins.sql` using `ref('stg_coingecko__coins_list')`.
2. Add `dim_asset_platforms.sql` using `ref('stg_coingecko__asset_platforms')`.
3. Add model YAML descriptions and data tests.
4. Add repo-level tests for model presence and references.

## Acceptance Criteria

- [ ] `dim_coins` exists and references `stg_coingecko__coins_list`.
- [ ] `dim_asset_platforms` exists and references `stg_coingecko__asset_platforms`.
- [ ] Mart models materialize as views in `marts`.
- [ ] Mart keys are not-null and unique for present rows.
- [ ] No intermediate model is added.
- [ ] Empty upstream tables do not fail mart tests.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

