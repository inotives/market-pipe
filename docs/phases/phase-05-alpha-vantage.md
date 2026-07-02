# Phase 5 - Alpha Vantage

## Purpose

Add the second API source and confirm the feature-module pattern works beyond CoinGecko.

This phase should stay small: daily OHLCV with configured symbols first.

## Scope

- `alphavantage` source module.
- CLI command: `market-pipe alphavantage run`.
- Configured symbols list.
- Daily OHLCV ingestion.
- API-key based request handling.
- Mocked tests for symbol iteration and timestamp identity.

## Out Of Scope

- Every Alpha Vantage function.
- Intraday data unless daily ingestion exposes a real need.
- Fundamentals endpoints.
- Source dependency graph.

## Acceptance Signals

- Mocked tests cover symbol iteration.
- Mocked tests cover timestamp identity.
- Re-running the same day skips duplicates.
- dbt staging grain is `symbol, observed_at, interval`.

## Open Decisions

- How should symbols be configured: environment variable, file, or CLI flag?
- Should the first interval be daily only?
- Should API-key absence fail command startup or only fail live runs?
