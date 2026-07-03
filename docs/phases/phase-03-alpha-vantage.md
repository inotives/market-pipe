# Phase 3 - Alpha Vantage

## Purpose

Add the second API source and confirm the feature-module pattern works beyond CoinGecko.

This phase should stay small: Alpha Vantage `TIME_SERIES_DAILY` OHLCV with configured symbols first.

## Scope

- `alphavantage` source module.
- CLI command: `market-pipe alphavantage run`.
- Configured symbols list in `src/features/alphavantage/config.yaml`.
- Bootstrap support for the `alphavantage` Postgres schema.
- Daily OHLCV ingestion using `TIME_SERIES_DAILY` with `outputsize=compact`.
- API-key based request handling via `MARKET_PIPE__ALPHAVANTAGE_API_KEY`.
- Per-run quota guard for the default 25 requests/day limit.
- Single-symbol runner with all-configured-symbol looping.
- Configured delay between symbol API calls.
- Mocked tests for symbol iteration and timestamp identity.
- Opt-in one-symbol live smoke test.

## Out Of Scope

- Every Alpha Vantage function.
- Intraday data unless daily ingestion exposes a real need.
- Daily adjusted data.
- `outputsize=full` backfills.
- Fundamentals endpoints.
- Source dependency graph.
- Live smoke tests that run every configured symbol by default.

## Initial Symbols

- `SPCX`
- `TSM`
- `MSFT`
- `GOOG`
- `NVDA`

At one API request per symbol, the initial configured run uses 5 Alpha Vantage requests.

## Config Shape

Store Alpha Vantage source settings in `src/features/alphavantage/config.yaml`.

```yaml
quota:
  dailyRequestLimit: 25
rateLimit:
  delayMs: 15000
symbols:
  - SPCX
  - TSM
  - MSFT
  - GOOG
  - NVDA
endpoints:
  - entity: daily
    function: TIME_SERIES_DAILY
    outputsize: compact
    table: alphavantage.raw_alphavantage__daily_stock_ohlcv
    idField: symbol:observed_at
```

The Phase 3 quota guard only checks the number of requests the current command is about to make. It does not persist usage across separate runs.

The core ingestion path handles one symbol at a time. Running without `--symbol` loads every configured symbol from YAML and loops through the same single-symbol path with `rateLimit.delayMs` between API calls.

## Raw Row Shape

`TIME_SERIES_DAILY` lands in `alphavantage.raw_alphavantage__daily_stock_ohlcv`.

Each daily candle is one raw row:

- `id`: `<symbol>:<observed_at>`
- `endpoint`: `TIME_SERIES_DAILY`
- `payload_jsonb`: the daily candle object plus enough symbol/source metadata for dbt staging
- `created_at`, `updated_at`, `deleted_at`: same semantics as other raw tables

## Acceptance Signals

- Mocked tests cover symbol iteration.
- Mocked tests cover timestamp identity.
- Re-running the same day skips duplicates.
- Running the initial 5-symbol list stays within the free-tier daily budget.
- A run with more configured symbols than `quota.dailyRequestLimit` fails before making API requests.
- `market-pipe alphavantage run --symbol MSFT` runs only the requested symbol.
- `market-pipe alphavantage run` loops through configured YAML symbols with a 15s delay between API calls.
- Requests use `outputsize=compact`.
- Live smoke tests only run when `MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1`.
- The default live smoke symbol is `MSFT`.
- A skipped-by-default live smoke test is wired to `MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1`.
- Real Alpha Vantage runs fail at startup when `MARKET_PIPE__ALPHAVANTAGE_API_KEY` is missing.
- Local bootstrap creates the `alphavantage` schema.
- Raw rows land in `alphavantage.raw_alphavantage__daily_stock_ohlcv` at `symbol, observed_at` grain.
- dbt staging grain is `symbol, observed_at, interval`.

## Worker Task Split

1. Add Alpha Vantage config, schema metadata, and bootstrap skeleton.
2. Add Alpha Vantage client, API-key handling, and per-run quota guard.
3. Add daily OHLCV raw extraction and upsert into `alphavantage.raw_alphavantage__daily_stock_ohlcv`.
4. Add CLI support for `alphavantage run` and `--symbol`.
5. Add mocked tests, skipped-by-default one-symbol live smoke, and docs.
