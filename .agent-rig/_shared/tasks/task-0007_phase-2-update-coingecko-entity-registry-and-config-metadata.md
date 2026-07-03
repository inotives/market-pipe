---
id: task-0007
title: "Phase 2: update CoinGecko entity registry and config metadata"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0006
message: "Accepted by reviewer: Phase 2 CoinGecko metadata is present, schedule
  intent is metadata-only, metadata-only entities now fail before ingestion
  dispatch, and typecheck/tests pass."
---





# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

Phase 1 already added the `coingecko` feature folder, `coins_list`, raw landing table shape, and the entity-driven CLI pattern.

## Goal

Expand the CoinGecko entity metadata so Phase 2 endpoints are known to the feature before endpoint-specific ingestion behavior is implemented.

## Scope

- Update `src/features/coingecko/config.yaml`.
- Update the CoinGecko entity registry/types as needed.
- Include these entities:
  - `coins_list`
  - `asset_platforms_list`
  - `trending_search`
  - `crypto_global`
  - `derivatives_exchanges`
  - `exchanges`
  - `coins_categories`
  - `coins_id_history`
  - `coins_id_ohlc`
- Capture schedule intent as metadata only:
  - `asset_platforms_list`: daily at `00:30:00 UTC`
  - `trending_search`: daily at `01:00:00 UTC`
  - `crypto_global`: 10 minutes past every hour
  - `derivatives_exchanges`: daily at `01:30:00 UTC`
  - `exchanges`: daily at `02:00:00 UTC`
  - `coins_categories`: manual
  - `coins_id_history`: manual
  - `coins_id_ohlc`: manual

## Planner Notes

- Do not add a scheduler in Phase 2.
- Keep config local to the CoinGecko feature folder.
- Prefer the existing Phase 1 entity pattern over a new provider abstraction.

## Implementation Plan

1. Review current CoinGecko config and entity typing.
2. Add all Phase 2 entity metadata and endpoint paths.
3. Add schedule metadata in a simple shape workers can use later.
4. Run the smallest relevant type/test check.

## Acceptance Criteria

- [ ] All Phase 2 entities are present in CoinGecko config/registry.
- [ ] Schedule intent is recorded as metadata only.
- [ ] No scheduling runtime is introduced.
- [ ] Existing `coins_list` behavior remains compatible.
- [ ] TypeScript check passes.

## Notes

Reviewer finding:

- `src/features/coingecko/cli.ts` now resolves every Phase 2 entity through `getCoinGeckoEndpoint(entity)`, but still always calls `runCoinsList()`. This means `market-pipe coingecko run --entity exchanges` would run the `coins_list` ingestion and report it as `exchanges`. Keep new entities as metadata-only until their handlers exist, or dispatch only implemented entities and fail clearly for metadata-only entities.
