---
id: task-0019
title: "Phase 4: add Custom CSV bootstrap schema and raw tables"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0018
---

# Task

## Context

Phase 4 plan: `docs/phases/phase-04-custom-csv.md`.

Custom CSV uses source-owned raw tables under the `custom_csv` schema.

## Goal

Add bootstrap SQL and DB bootstrap tests for the Custom CSV schema and raw tables.

## Scope

- Update bootstrap SQL to create `custom_csv`.
- Add `custom_csv.raw_custom_csv__economic_time_series`.
- Add `custom_csv.raw_custom_csv__crypto_ohlcv`.
- Each raw table should include:
  - `id text primary key`
  - `entity text not null`
  - `csv_path text not null`
  - `header_shape jsonb not null`
  - `row_data jsonb not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `deleted_at timestamptz`

## Planner Notes

- Keep raw CSV row data generic. Do not unpack typed economic or OHLCV columns in raw.
- `csv_path` stores the resolved absolute path from `--file`.
- `header_shape` stores only the ordered header list.

## Implementation Plan

1. Extend `sql/bootstrap.sql`.
2. Extend static bootstrap tests.
3. Extend DB-backed bootstrap tests for the new schema and table columns.
4. Run typecheck and default tests.
5. Run DB-backed tests when Postgres is available.

## Acceptance Criteria

- [ ] Local bootstrap creates the `custom_csv` schema.
- [ ] Local bootstrap creates `custom_csv.raw_custom_csv__economic_time_series`.
- [ ] Local bootstrap creates `custom_csv.raw_custom_csv__crypto_ohlcv`.
- [ ] Both raw tables have the planned columns.
- [ ] DB-backed bootstrap tests cover the new schema and tables.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
