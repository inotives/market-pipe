---
id: task-0018
title: "Phase 4: add Custom CSV config and parser skeleton"
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

Phase 4 plan: `docs/phases/phase-04-custom-csv.md`.

This task starts the Custom CSV source module and parser registry without implementing DB writes yet.

## Goal

Add the Custom CSV feature skeleton, YAML config, and parser skeleton for configured CSV entity families.

## Scope

- Add `src/features/custom_csv/config.yaml`.
- Add configured entities:
  - `CORESTICKM159SFRBATL`
  - `PPIACO`
  - `bitcoin_historical_ohlcv`
  - `ethereum_historical_ohlcv`
- Add parser modes:
  - `economic_time_series`
  - `crypto_ohlcv`
- Add config fields per entity:
  - `entity`
  - `table`
  - `parser`
  - `delimiter`
  - `expectedHeaders`
  - `idFields`
  - `asset` for `crypto_ohlcv` entities
- Add `src/features/custom_csv/parser.ts` with parser dispatch, delimiter handling, UTF-8 BOM stripping, and header validation helpers.
- Add Custom CSV feature registration skeleton.

## Planner Notes

- Parser names are code-backed, not arbitrary YAML logic.
- Keep parser code in `parser.ts`; do not create a parser folder yet.
- Do not implement raw DB upsert or full CLI execution in this task.
- Downloaded public CSV files under `data/csv` are local test/demo inputs, not committed or packaged runtime assets.

## Implementation Plan

1. Inspect the CoinGecko and Alpha Vantage feature/config patterns.
2. Add Custom CSV config and feature skeleton.
3. Add parser skeleton and header validation helpers.
4. Add tests for config lookup, parser dispatch, delimiter handling, and BOM-stripped header validation.
5. Run typecheck and default tests.

## Acceptance Criteria

- [ ] `src/features/custom_csv/config.yaml` includes all four planned entities.
- [ ] Economic entities use `custom_csv.raw_custom_csv__economic_time_series`.
- [ ] Crypto OHLCV entities use `custom_csv.raw_custom_csv__crypto_ohlcv`.
- [ ] Crypto OHLCV entities include `asset`.
- [ ] Parser helpers strip UTF-8 BOM from the first header before validation.
- [ ] Header mismatch fails clearly.
- [ ] Feature registry can see the Custom CSV skeleton.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
