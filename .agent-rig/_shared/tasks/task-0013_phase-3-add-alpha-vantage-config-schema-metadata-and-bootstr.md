---
id: task-0013
title: "Phase 3: add Alpha Vantage config, schema metadata, and bootstrap skeleton"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on: []
---

# Task

## Context

Phase 3 plan: `docs/phases/phase-03-alpha-vantage.md`.

This task starts the Alpha Vantage source module without implementing live ingestion yet.

## Goal

Add the Alpha Vantage feature skeleton, YAML config, env template, and local bootstrap support needed by later Phase 3 tasks.

## Scope

- Add `src/features/alphavantage/config.yaml`.
- Configure initial symbols: `SPCX`, `TSM`, `MSFT`, `GOOG`, `NVDA`.
- Configure `quota.dailyRequestLimit: 25`.
- Configure `rateLimit.delayMs: 15000`.
- Configure the daily endpoint metadata:
  - `entity: daily`
  - `function: TIME_SERIES_DAILY`
  - `outputsize: compact`
  - `table: alphavantage.raw_alphavantage__daily_stock_ohlcv`
  - `idField: symbol:observed_at`
- Add the `alphavantage` source module registration skeleton.
- Update bootstrap SQL so local setup creates the `alphavantage` Postgres schema.
- Keep `.env.example` aligned with `MARKET_PIPE__ALPHAVANTAGE_API_KEY`.

## Planner Notes

- Match the existing CoinGecko feature-module and config loading patterns.
- Do not implement requests, parsing, upsert, or CLI execution in this task.
- Do not read or print `.env.local`.

## Implementation Plan

1. Inspect the existing CoinGecko feature registration and config loader.
2. Add the Alpha Vantage feature folder and config.
3. Register the Alpha Vantage feature enough for later CLI wiring.
4. Add schema bootstrap support.
5. Run the narrowest relevant static checks.

## Acceptance Criteria

- [ ] `src/features/alphavantage/config.yaml` exists with the planned symbols, quota, rate limit, and daily endpoint metadata.
- [ ] The feature registry can see the Alpha Vantage source skeleton.
- [ ] Local bootstrap creates the `alphavantage` schema.
- [ ] `.env.example` includes `MARKET_PIPE__ALPHAVANTAGE_API_KEY`.
- [ ] `npm run typecheck` passes.

## Notes
