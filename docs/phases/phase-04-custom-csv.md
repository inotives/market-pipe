# Phase 4 - Custom CSV

## Purpose

Add a file-based source so the CLI can ingest user-supplied market data without pretending CSV is an API provider.

The first CSV contract should be narrow: configured public economic time-series and OHLCV CSV files with explicit entity and file inputs.

## Scope

- `custom_csv` source module.
- CLI command: `market-pipe custom-csv run`.
- Required file input via `--file`.
- Required entity input via `--entity`.
- Entity metadata in `src/features/custom_csv/config.yaml`.
- Row identity and parser mode configured per entity.
- Generic row landing with `row_data`, `header_shape`, `entity`, and `csv_path`.
- Validation for invalid rows.
- Initial entities:
  - Core CPI: `CORESTICKM159SFRBATL`
  - PPI: `PPIACO`
  - Bitcoin historical OHLCV: `bitcoin_historical_ohlcv`
  - Ethereum historical OHLCV: `ethereum_historical_ohlcv`
- Bootstrap support for the `custom_csv` Postgres schema.
- dbt staging models deferred until the dbt phase.

## Out Of Scope

- Arbitrary CSV schema inference.
- Multi-file batch framework.
- Historical schema registry.
- General-purpose CSV transformation.
- Partial file loading with invalid-row side tables.
- Remote CSV URLs.
- Packaging sample CSV files as runtime npm assets.
- Committing downloaded public CSV files.

## Config Shape

Store Custom CSV source settings in `src/features/custom_csv/config.yaml`.

```yaml
entities:
  - entity: CORESTICKM159SFRBATL
    table: custom_csv.raw_custom_csv__economic_time_series
    parser: economic_time_series
    delimiter: ","
    expectedHeaders:
      - observation_date
      - CORESTICKM159SFRBATL
    idFields:
      - entity
      - observation_date
  - entity: PPIACO
    table: custom_csv.raw_custom_csv__economic_time_series
    parser: economic_time_series
    delimiter: ","
    expectedHeaders:
      - observation_date
      - PPIACO
    idFields:
      - entity
      - observation_date
  - entity: bitcoin_historical_ohlcv
    table: custom_csv.raw_custom_csv__crypto_ohlcv
    parser: crypto_ohlcv
    asset: bitcoin
    delimiter: ";"
    expectedHeaders:
      - timeOpen
      - timeClose
      - timeHigh
      - timeLow
      - name
      - open
      - high
      - low
      - close
      - volume
      - marketCap
      - circulatingSupply
      - timestamp
    idFields:
      - entity
      - timestamp
  - entity: ethereum_historical_ohlcv
    table: custom_csv.raw_custom_csv__crypto_ohlcv
    parser: crypto_ohlcv
    asset: ethereum
    delimiter: ";"
    expectedHeaders:
      - timeOpen
      - timeClose
      - timeHigh
      - timeLow
      - name
      - open
      - high
      - low
      - close
      - volume
      - marketCap
      - circulatingSupply
      - timestamp
    idFields:
      - entity
      - timestamp
```

The config must keep entity behavior dynamic enough for later non-snapshot CSV types. Phase 4 should not hardcode all CSV behavior around these two files.
CSV parsing should strip a UTF-8 BOM from the first header before validating `expectedHeaders`.

## Parser Shape

Custom CSV parser code lives inside the Custom CSV feature module:

```text
src/features/custom_csv/
  cli.ts
  config.yaml
  feature.ts
  parser.ts
  runner.ts
```

For Phase 4, keep parser logic in `parser.ts`:

- delimiter handling
- UTF-8 BOM stripping
- header validation against `expectedHeaders`
- row-to-object parsing
- dispatch by configured `parser` value

`runner.ts` owns CLI inputs, config lookup, row id construction, and raw DB upsert.

Parser names are code-backed, not arbitrary YAML logic. To add a future CSV source:

1. Reuse an existing parser when the CSV shape already fits.
2. Add a new parser mode in `parser.ts` only when the row family is genuinely different.
3. Add or update entity metadata in `config.yaml`.
4. Add/bootstrap a raw table only when the parser family needs a separate table.
5. Add tests for header validation and row identity.

## Validation Behavior

Phase 4 validates the full CSV before writing any rows.

Validation failures fail the whole command and must include useful row numbers. No valid rows should be inserted when any row is invalid.

Duplicate generated ids within the same CSV file are invalid and fail before any DB writes. Duplicate ids across separate runs are handled by raw upsert: the later run replaces `row_data`, `header_shape`, and `csv_path` for the same id.

## Raw Row Shape

Economic time-series CSV rows land in `custom_csv.raw_custom_csv__economic_time_series`.
Crypto OHLCV CSV rows land in `custom_csv.raw_custom_csv__crypto_ohlcv`.

Suggested columns:

- `id`: configured from entity `idFields`; initially `<entity>:<observation_date>`
- `entity`: configured entity name
- `csv_path`: resolved absolute path for the `--file` input
- `header_shape`: ordered CSV header names as JSON
- `row_data`: one CSV row as JSON
- `created_at`, `updated_at`, `deleted_at`: same semantics as other raw tables

Row identity must not include `csv_path`. Moving or renaming a CSV should update the same configured observation rows rather than creating duplicates.
`header_shape` stores only the ordered header list.
`updated_at` changes on every successful rerun/upsert, even when `row_data` is identical, to show the row was seen again.

For `crypto_ohlcv` entities, config should include `asset` and raw payload metadata should preserve that asset identity for dbt staging.

## CLI Shape

Phase 4 requires explicit `--entity` and `--file` inputs. It should not infer default files from `data/csv`.
Only local filesystem paths are supported.
Downloaded public CSV files under `data/csv` are local test/demo inputs and should not be committed or packaged as required runtime assets. Keep `data/csv/.gitkeep` so the local download folder exists.

```bash
market-pipe custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
market-pipe custom-csv run --entity bitcoin_historical_ohlcv --file data/csv/bitcoin-historical-ohlcv.csv
```

## Acceptance Signals

- Tests cover file parsing.
- Tests cover invalid rows.
- Tests cover configured entity lookup.
- Invalid rows fail the whole file before any DB writes.
- Duplicate ids within one CSV fail the whole file before any DB writes.
- Raw rows land idempotently.
- Re-running the same CSV updates existing rows instead of duplicating them.
- Running a moved or renamed CSV with the same entity and row ids updates existing rows instead of duplicating them.
- Local bootstrap creates the `custom_csv` schema.
- Local bootstrap creates `custom_csv.raw_custom_csv__economic_time_series`.
- Local bootstrap creates `custom_csv.raw_custom_csv__crypto_ohlcv`.
- Core CPI and PPI fixture files ingest successfully.
- Bitcoin and Ethereum historical OHLCV fixture files ingest successfully.
- CSV ingestion tests run by default using deterministic temporary fixture files, not committed public downloads.

## Worker Task Split

1. Add Custom CSV config and parser skeleton.
2. Add `custom_csv` bootstrap schema and raw tables.
3. Add economic time-series ingestion and tests.
4. Add crypto OHLCV ingestion and tests.
5. Add CLI wiring, docs, and default sample-file smoke tests.
