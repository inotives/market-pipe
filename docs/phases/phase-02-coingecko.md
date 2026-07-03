# Phase 2 - CoinGecko

## Purpose

Expand the first real API source and prove raw ingestion, retries, optional pagination limits, parameterized endpoint handling, and idempotent landing across several CoinGecko endpoint shapes.

CoinGecko should stay the first real source because it exercises list endpoints, singleton endpoints, and parameterized manual endpoints.

Implementation should continue the entity-driven command pattern from Phase 1. All Phase 2 entities are manually triggerable through the CLI. Scheduling metadata may be recorded for later orchestration, but no scheduler should be implemented in this phase.

## Scope

- `coingecko` source module.
- CLI command: `market-pipe coingecko run --entity <entity>`.
- Entities:
  - `coins_list`
  - `asset_platforms_list`
  - `trending_search`
  - `crypto_global`
  - `derivatives_exchanges`
  - `exchanges`
  - `coins_categories`
  - `coins_id_history`
  - `coins_id_ohlc`
- Retries for `429`, `500`, `502`, `503`, and `504`.
- Page cap settings only for endpoints that expose `page` / `per_page`.
- Parameter support for manual endpoints:
  - `coins_id_history`: `--id <coin_id> --date <dd-mm-yyyy>`
  - `coins_id_ohlc`: `--id <coin_id> --vs-currency <currency> --days <days>`
- Mocked tests for each entity.
- Opt-in live smoke run.

## Endpoint Plan

| Entity | CoinGecko endpoint | Trigger policy |
| --- | --- | --- |
| `coins_list` | `GET /coins/list` | Daily metadata already established in Phase 1 |
| `asset_platforms_list` | `GET /asset_platforms` | Manual in Phase 2; intended daily at `00:30:00 UTC` later |
| `trending_search` | `GET /search/trending` | Manual in Phase 2; intended daily at `01:00:00 UTC` later |
| `crypto_global` | `GET /global` | Manual in Phase 2; intended 10 minutes past every hour later |
| `derivatives_exchanges` | `GET /derivatives/exchanges` | Manual in Phase 2; intended daily at `01:30:00 UTC` later |
| `exchanges` | `GET /exchanges` | Manual in Phase 2; intended daily at `02:00:00 UTC` later |
| `coins_categories` | `GET /coins/categories` | Manual trigger |
| `coins_id_history` | `GET /coins/{id}/history` | Manual trigger with `id` and `date`; date format is `dd-mm-yyyy` |
| `coins_id_ohlc` | `GET /coins/{id}/ohlc` | Manual trigger with `id`, `vs_currency`, and `days`; accepted `days` values are `1`, `7`, `14`, `30`, `90`, `180`, `365` |

## Raw Row Grain

All entities continue to land in source-owned raw tables:

```text
coingecko.raw_coingecko__<entity>
```

Each raw table keeps the standard columns:

```text
id, endpoint, payload_jsonb, created_at, updated_at, deleted_at
```

Row identity rules:

- Array responses store one raw row per item.
- Object responses store one raw row for the endpoint result.
- Parameterized endpoint ids include the relevant parameters.
- Missing or blank expected ids fail the run. Do not generate hash or positional fallback ids in Phase 2.

Planned ids:

| Entity | Raw `id` |
| --- | --- |
| `coins_list` | `coin.id` |
| `asset_platforms_list` | `platform.id` |
| `trending_search` | `coin:<item.item.id>`, `nft:<item.id>`, or `category:<item.id>` |
| `crypto_global` | `global` |
| `derivatives_exchanges` | `exchange.id` |
| `exchanges` | `exchange.id` |
| `coins_categories` | `category.id` |
| `coins_id_history` | `<coin_id>:<date>` |
| `coins_id_ohlc` | `<coin_id>:<vs_currency>:<days>` |

## Retry And Pagination Policy

Retry policy:

- Retry status codes: `429`, `500`, `502`, `503`, `504`.
- Default attempts: `3`.
- Default backoff: `1s`, then `2s`, then fail.
- Respect `Retry-After` when present.
- Environment configuration:
  - `MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS`
  - `MARKET_PIPE__COINGECKO_RETRY_BASE_MS`

Pagination policy:

- Implement pagination only for endpoints that expose `page` / `per_page`.
- Default page limit: `MARKET_PIPE__COINGECKO_PAGE_LIMIT=1`.
- Default page size: `MARKET_PIPE__COINGECKO_PER_PAGE=250`.
- Manual CLI overrides:
  - `--page-limit <count>`
  - `--per-page <count>`

## Out Of Scope

- Historical backfills.
- Every CoinGecko endpoint.
- Provider abstraction layer.
- Production scheduling.
- dbt marts beyond what Phase 3 explicitly covers.

## Acceptance Signals

- Mocked tests cover each planned entity.
- Live smoke run is opt-in and documented.
- Raw rows land idempotently.
- Re-running the same entity does not create duplicate raw records.
- Parameterized endpoints require explicit CLI parameters and produce stable composite ids.
- Retry behavior is covered by mocked tests.
- Pagination, where supported, respects page limits.

## Open Decisions

- Confirm from CoinGecko docs which Phase 2 endpoints expose pagination.
