---
id: task-0036
title: "Phase 8: add schedulable config contract and CoinGecko cron metadata"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on: []
message: "Reviewed: schedule contract adds cliArgs for hourly/daily items,
  CoinGecko scheduled endpoints are seeded, and typecheck/tests pass."
---




# Task

## Context

Phase 8 plan: `docs/phases/phase-08-generated-host-cron.md`.

Phase 8 generates host cron artifacts from feature `config.yaml` schedule metadata. `coingecko` is the seeded case, but the contract must be generic so other features can join later if their config fully describes a runnable scheduled command.

## Goal

Extend the feature schedule contract to support generated cron and seed `coingecko` with runnable metadata.

## Scope

- Keep the existing schedule cadence shape:
  - `type: hourly | daily | manual`
  - `minute` for hourly schedules
  - `timeUtc` for daily schedules
- Add runnable scheduler args to non-manual scheduled config items:
  - `cliArgs: string[]`
- Update the TypeScript feature config types and validation to reflect the new contract.
- Seed all currently scheduled CoinGecko endpoints with the exact CLI args needed to render:
  - `market-pipe coingecko run ...`
- Keep `manual` CoinGecko endpoints unscheduled.
- Do not implement cron rendering in this task.
- Do not add feature-specific scheduler code for `alphavantage`, `custom_csv`, or `agent_local` in this task.

## Planner Notes

- The contract should stay config-driven, not code-driven.
- Any non-`manual` item must carry enough information to form a runnable command later.
- `coingecko` should be fully schedulable after this task because its commands are self-contained once `cliArgs` exists.
- Features with partial runtime requirements, such as file paths or project IDs, should remain untouched until they can describe a runnable scheduled command in config.

## Implementation Plan

1. Extend the schedule/config types for schedulable feature items.
2. Tighten config validation so invalid scheduled items fail clearly.
3. Add `cliArgs` to all scheduled CoinGecko endpoints.
4. Update tests that assert config shape or schedule metadata.
5. Run typecheck and tests.

## Acceptance Criteria

- [x] The schedule contract supports `cliArgs: string[]` for schedulable config items.
- [x] Invalid non-`manual` schedule items fail validation if they do not provide runnable args.
- [x] Current scheduled CoinGecko endpoints include runnable `cliArgs`.
- [x] Current manual CoinGecko endpoints remain excluded from scheduling metadata requirements.
- [x] No cron renderer or cron CLI is added in this task.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.

## Notes

- Added a shared `src/features/schedule.ts` validator for `manual`, `hourly`, and `daily` schedule metadata, with `cliArgs` required only for non-manual schedules.
- Wired `src/features/coingecko/feature.ts` through that validator and exported `validateCoinGeckoConfig()` so tests can assert failure cases directly.
- Seeded scheduled CoinGecko endpoints with runnable `coingecko run --entity ...` argument arrays in `src/features/coingecko/config.yaml`.
- Left unscheduled and `manual` CoinGecko endpoints without runnable metadata requirements.
- Verification:
  - `npm run typecheck`
  - `npm test`
