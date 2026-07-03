---
id: task-0009
title: "Phase 2: add raw row extraction for simple CoinGecko entities"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0008
message: "Accepted by reviewer: simple CoinGecko entities extract stable raw
  ids, missing ids fail, raw tables are bootstrapped, idempotent DB-backed
  landing passes, and typecheck/default/DB tests pass."
---





# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

Phase 1 established the raw table contract: `id`, `endpoint`, `payload_jsonb`, `created_at`, `updated_at`, `deleted_at`.

## Goal

Add row extraction and id mapping for Phase 2 non-parameterized CoinGecko endpoints.

## Scope

Implement raw ingestion for:

- `asset_platforms_list`: `GET /asset_platforms`, id `platform.id`
- `trending_search`: `GET /search/trending`, ids:
  - `coin:<item.item.id>`
  - `nft:<item.id>`
  - `category:<item.id>`
- `crypto_global`: `GET /global`, id `global`
- `derivatives_exchanges`: `GET /derivatives/exchanges`, id `exchange.id`
- `exchanges`: `GET /exchanges`, id `exchange.id`
- `coins_categories`: `GET /coins/categories`, id `category.id`

## Planner Notes

- Array responses store one raw row per item.
- Object responses store one raw row for the endpoint result.
- Missing or blank expected ids must fail the run.
- Do not generate hash or positional fallback ids.
- Each entity lands in `coingecko.raw_coingecko__<entity>`.

## Implementation Plan

1. Add endpoint handlers for the listed entities.
2. Add row extraction functions or the smallest equivalent local mapping.
3. Ensure each entity creates/uses the correct raw table name.
4. Preserve idempotent upsert behavior.
5. Add mocked tests for id mapping and missing-id failures.

## Acceptance Criteria

- [ ] Each listed entity can be run through `market-pipe coingecko run --entity <entity>`.
- [ ] Each listed entity lands in `coingecko.raw_coingecko__<entity>`.
- [ ] Re-running the same mocked payload does not create duplicate raw rows.
- [ ] Missing or blank ids fail with a clear error.
- [ ] `trending_search` stores typed rows for coins, NFTs, and categories.

## Notes

Reviewer finding:

- `MARKET_PIPE__RUN_DB_TESTS=1 npm test` fails because the DB-backed tests bootstrap the expanded raw table set concurrently. The failure is `duplicate key value violates unique constraint "pg_type_typname_nsp_index"` for `raw_coingecko__asset_platforms_list`, raised from `bootstrapDatabase()` while another DB test is creating the same table. The Phase 2 task requires DB-backed idempotence for raw landing, so the opt-in Postgres suite must pass reliably. Serialize DB bootstrap/tests, make bootstrap concurrency-safe, or otherwise prevent parallel `CREATE TABLE IF NOT EXISTS` races.
