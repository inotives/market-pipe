---
id: task-0021
title: "Phase 4: add crypto OHLCV CSV ingestion and tests"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-04
priority: normal
parent: ""
depends_on:
  - task-0020
---



# Task

## Context

Phase 4 plan: `docs/phases/phase-04-custom-csv.md`.

Crypto OHLCV CSVs are configured semicolon-delimited local files with BOM-prefixed headers in the sample data.

## Goal

Implement parsing, validation, row id construction, and raw upsert for crypto OHLCV CSV files.

## Scope

- Support configured `crypto_ohlcv` parser mode.
- Support semicolon-delimited files.
- Strip UTF-8 BOM from the first header before validation.
- Preserve config `asset` metadata in raw row data or payload metadata.
- Generate ids from configured `idFields`, initially `<entity>:<timestamp>`.
- Store rows in `custom_csv.raw_custom_csv__crypto_ohlcv`.
- Support the same CSV shapes as the public sample files:
  - `bitcoin-historical-ohlcv.csv`
  - `ethereum-historical-ohlcv.csv`

## Planner Notes

- Use `asset` from config, not from file path.
- Do not create Bitcoin-specific parser logic; this parser family is `crypto_ohlcv`.
- The raw table should stay generic JSON raw landing, not typed OHLCV columns.

## Implementation Plan

1. Add `crypto_ohlcv` parser implementation.
2. Add row validation and duplicate-id preflight for timestamp ids.
3. Add raw extraction/upsert into `custom_csv.raw_custom_csv__crypto_ohlcv`.
4. Add parser, idempotence, and asset metadata tests.
5. Run typecheck, default tests, and DB-backed tests when Postgres is available.

## Acceptance Criteria

- [ ] Bitcoin historical OHLCV fixture file parses and validates.
- [ ] Ethereum historical OHLCV fixture file parses and validates.
- [ ] BOM-prefixed headers are accepted after stripping the BOM.
- [ ] Raw rows include configured `asset` metadata.
- [ ] Raw rows land in `custom_csv.raw_custom_csv__crypto_ohlcv`.
- [ ] Re-running the same CSV updates existing rows instead of duplicating.
- [ ] Duplicate ids within one CSV fail before any DB writes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

Reviewer accepted on 2026-07-04.

- Bitcoin and Ethereum fixture-shaped rows parse and validate, including BOM-prefixed headers.
- Raw rows include configured `asset` metadata and land in `custom_csv.raw_custom_csv__crypto_ohlcv`.
- `npm run typecheck` passed.
- `npm test` passed: 51 passed, 12 skipped.
- `MARKET_PIPE__RUN_DB_TESTS=1 npm test` passed with local Postgres access: 61 passed, 2 skipped.
