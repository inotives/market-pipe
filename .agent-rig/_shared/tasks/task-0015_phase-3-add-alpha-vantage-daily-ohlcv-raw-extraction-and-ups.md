---
id: task-0015
title: "Phase 3: add Alpha Vantage daily OHLCV raw extraction and upsert"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0014
---

# Task

## Context

Phase 3 plan: `docs/phases/phase-03-alpha-vantage.md`.

Alpha Vantage `TIME_SERIES_DAILY` returns a symbol-level time series. Market Pipe raw landing stores one row per observed daily candle.

## Goal

Parse Alpha Vantage daily OHLCV responses into standardized raw rows and upsert them into `alphavantage.raw_alphavantage__daily_stock_ohlcv`.

## Scope

- Create or migrate the raw table `alphavantage.raw_alphavantage__daily_stock_ohlcv`.
- Convert each daily candle into one raw row.
- Use row id `<symbol>:<observed_at>`.
- Store `endpoint: TIME_SERIES_DAILY`.
- Store `payload_jsonb` as the candle object plus enough symbol/source metadata for dbt staging.
- Preserve standard timestamp semantics: `created_at`, `updated_at`, `deleted_at`.
- Keep reruns idempotent at `symbol, observed_at` grain.

## Planner Notes

- Do not unpack OHLCV into typed columns in raw. dbt staging will do that later.
- Follow the raw table contract already used by CoinGecko.
- Fail clearly when the Alpha Vantage response does not contain the expected daily series.

## Implementation Plan

1. Inspect existing raw table/bootstrap/upsert helpers.
2. Add Alpha Vantage raw table creation.
3. Add daily response extraction to standardized raw rows.
4. Wire upsert behavior for the new raw table.
5. Add mocked and DB-backed idempotence tests.

## Acceptance Criteria

- [ ] Each Alpha Vantage daily candle lands as one raw row.
- [ ] Raw row ids use `<symbol>:<observed_at>`.
- [ ] Raw rows use `endpoint = TIME_SERIES_DAILY`.
- [ ] Raw rows land in `alphavantage.raw_alphavantage__daily_stock_ohlcv`.
- [ ] Rerunning the same response updates rows instead of duplicating them.
- [ ] DB-backed tests cover idempotent raw landing.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
