---
id: task-0005
title: "Phase 1: implement coins_list ingestion and upsert"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-02
updated_on: 2026-07-02
priority: normal
parent: ""
depends_on:
  - task-0002
  - task-0003
  - task-0004
message: "Accepted by reviewer: required-config failure is clear, mocked fetch
  tests pass, local Postgres ingestion upserts rows without duplicates, missing
  rows keep deleted_at null, payload_jsonb remains raw, live smoke is opt-in."
---




# Task

## Context

Phase 1 plan: `docs/phases/phase-01-project-skeleton.md`.

This task implements the first real CoinGecko slice: `coins_list`.

## Goal

Implement `market-pipe coingecko run --entity coins_list` so it fetches, validates, and upserts one current raw row per CoinGecko coin ID.

## Scope

- CLI command: `market-pipe coingecko run --entity coins_list`.
- Local dev command: `npm run market-pipe -- coingecko run --entity coins_list`.
- Normal run requires:
  - `MARKET_PIPE__DATABASE_URL`
  - `MARKET_PIPE__COINGECKO_API_KEY`
- CoinGecko endpoint path: `/coins/list`.
- Raw grain: one current row per CoinGecko `id`.
- Upsert behavior:
  - first insert sets `created_at`
  - later daily refreshes update the same `id` row
  - later refreshes replace `payload_jsonb`
  - later refreshes set `updated_at`
- Missing API rows do not automatically set `deleted_at`.

## Planner Notes

- Store the full source row as `payload_jsonb`.
- Do not unpack JSON into normalized raw columns.
- Tests use fixture or mock paths.
- Live CoinGecko calls are opt-in smoke runs only.
- No user-facing offline mode.

## Implementation Plan

1. Implement CoinGecko client for `/coins/list`.
2. Wire command validation for required config.
3. Validate response rows through the `coins_list` schema.
4. Upsert rows into `coingecko.raw_coingecko__coins_list`.
5. Add fixture or mocked ingestion test against real local Postgres.
6. Add opt-in live smoke path if it can be done without making tests flaky.

## Acceptance Criteria

- [ ] `coingecko run --entity coins_list` fails fast with a clear message when required config is missing.
- [ ] Fixture or mocked tests can land `coins_list` rows into local Postgres.
- [ ] A test inserts a new `coins_list` row and updates the same `id` on a later run without creating a duplicate row.
- [ ] A test proves missing API rows do not automatically set `deleted_at`.
- [ ] Raw ingestion does not unpack `payload_jsonb`.
- [ ] An opt-in live smoke run can call CoinGecko and land `coins_list` rows when network/API access is available.

## Notes
