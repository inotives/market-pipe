---
id: task-0020
title: "Phase 4: add economic time-series CSV ingestion and tests"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-04
priority: normal
parent: ""
depends_on:
  - task-0019
---




# Task

## Context

Phase 4 plan: `docs/phases/phase-04-custom-csv.md`.

Economic time-series CSVs are configured, two-column local files such as `CORESTICKM159SFRBATL.csv` and `PPIACO.csv`.

## Goal

Implement parsing, validation, row id construction, and raw upsert for economic time-series CSV files.

## Scope

- Parse local CSV files using configured delimiter and headers.
- Validate the full file before DB writes.
- Fail on any invalid row with useful row numbers.
- Fail on duplicate generated ids within the same CSV before DB writes.
- Generate ids from configured `idFields`, initially `<entity>:<observation_date>`.
- Store:
  - `entity`
  - resolved absolute `csv_path`
  - `header_shape`
  - `row_data`
- Upsert into `custom_csv.raw_custom_csv__economic_time_series`.
- Support the same CSV shapes as the public sample files:
  - `CORESTICKM159SFRBATL.csv`
  - `PPIACO.csv`

## Planner Notes

- Row identity must not include `csv_path`.
- Re-running the same CSV updates existing rows instead of duplicating.
- Running a moved or renamed CSV with the same entity and row ids updates existing rows instead of duplicating.
- `updated_at` changes on every successful rerun/upsert, even if row data is identical.

## Implementation Plan

1. Add economic time-series parser implementation.
2. Add row validation and duplicate-id preflight.
3. Add raw row extraction and upsert.
4. Add mocked parser tests and DB-backed idempotence tests.
5. Run typecheck, default tests, and DB-backed tests when Postgres is available.

## Acceptance Criteria

- [ ] Core CPI fixture file parses and validates.
- [ ] PPI fixture file parses and validates.
- [ ] Header mismatch fails clearly.
- [ ] Invalid rows fail the whole file before any DB writes.
- [ ] Duplicate ids within one CSV fail the whole file before any DB writes.
- [ ] Raw rows land in `custom_csv.raw_custom_csv__economic_time_series`.
- [ ] Re-running the same CSV updates existing rows instead of duplicating.
- [ ] Running a moved/renamed CSV updates the same row ids instead of duplicating.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

Reviewer returned on 2026-07-04.

Finding:

- `src/features/custom_csv/parser.ts:50` maps CSV body lines through `toRow(...)` without passing the physical row number, so malformed rows with the wrong column count fail with `CSV row has 1 columns; expected 2` instead of a useful row number. This misses the task requirement that invalid rows fail with useful row numbers. Repro: `observation_date,PPIACO\n2024-01-01\n`.

Recommendation:

- Pass `index + 2` from `parseConfiguredCsv` into `toRow`, and include it in the column-count error, for example `CSV row 2 has 1 columns; expected 2`. Add a default parser test for a short or long row.

Checks run:

- `npm run typecheck` passed.
- `npm test` passed: 48 passed, 11 skipped.
- `MARKET_PIPE__RUN_DB_TESTS=1 npm test` passed with local Postgres access: 57 passed, 2 skipped.

Reviewer accepted on 2026-07-04 after fix.

- Column-count parser errors now include the physical CSV row number and have a default test.
- `npm run typecheck` passed.
- `npm test` passed: 49 passed, 11 skipped.
- `MARKET_PIPE__RUN_DB_TESTS=1 npm test` passed with local Postgres access: 58 passed, 2 skipped.
