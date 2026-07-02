# Phase 4 - Custom CSV

## Purpose

Add a file-based source so the CLI can ingest user-supplied market data without pretending CSV is an API provider.

The first CSV contract should be narrow: OHLCV-style files with explicit entity and file inputs.

## Scope

- `custom_csv` source module.
- CLI command: `market-pipe custom-csv run`.
- File input via `--file`.
- Entity input via `--entity`.
- Basic column mapping for OHLCV-style CSV files.
- Validation for invalid rows.
- dbt staging models exposing stable symbols, timestamps, and OHLCV values.

## Out Of Scope

- Arbitrary CSV schema inference.
- YAML-defined source configs.
- Multi-file batch framework.
- Historical schema registry.

## Acceptance Signals

- Tests cover file parsing.
- Tests cover invalid rows.
- Raw rows land idempotently.
- dbt staging exposes stable symbols, timestamps, and OHLCV values.

## Open Decisions

- What exact OHLCV column names are accepted by default?
- Should column mapping be CLI flags, a small JSON file, or deferred?
- Should invalid rows fail the whole file or be reported while valid rows continue?
