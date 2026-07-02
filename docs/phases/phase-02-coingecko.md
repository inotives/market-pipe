# Phase 2 - CoinGecko

## Purpose

Add the first real API source and prove raw ingestion, retries, pagination limits, and idempotent landing with market data.

CoinGecko should be the first real source because it exercises both simple singleton endpoints and paginated market endpoints.

Implementation should continue the entity-driven command pattern from Phase 1. Add `global` next to prove the pattern beyond `coins_list`, then expand to the remaining CoinGecko entities.

## Scope

- `coingecko` source module.
- CLI command: `market-pipe coingecko run --entity <entity>`.
- Entities:
  - `coins_list`
  - `asset_platforms_list`
  - `global`
  - `global_defi`
  - `coins_markets`
- Retries for `429`, `500`, `502`, `503`, and `504`.
- Page cap settings for `coins_markets`.
- Mocked tests for each entity.
- Opt-in live smoke run.

## Out Of Scope

- Historical backfills.
- Every CoinGecko endpoint.
- Provider abstraction layer.
- dbt marts beyond what Phase 3 explicitly covers.

## Acceptance Signals

- Mocked tests cover each planned entity.
- Live smoke run is opt-in and documented.
- Raw rows land idempotently.
- Re-running the same entity does not create duplicate raw records.

## Open Decisions

- What page cap should be the default for `coins_markets`?
- How should API rate-limit settings be exposed: environment variables only, CLI flags, or both?
