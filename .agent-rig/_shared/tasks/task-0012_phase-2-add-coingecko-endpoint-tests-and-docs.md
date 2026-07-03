---
id: task-0012
title: "Phase 2: add CoinGecko endpoint tests and docs"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0011
message: "Accepted by reviewer: live-data edge cases are fixed, all current
  CoinGecko endpoints run successfully against the real API and local Postgres,
  docs/tests are updated, and typecheck/default/DB/live tests pass."
---







# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

This task closes Phase 2 by making the new endpoint set testable and documented from a fresh checkout.

## Goal

Add the final mocked tests, DB-backed checks, README updates, and opt-in live smoke docs for Phase 2.

## Scope

- Mocked tests for every Phase 2 entity.
- DB-backed idempotence tests for representative simple and parameterized endpoints.
- README updates for manual Phase 2 commands.
- `.env.example` updates for new retry and pagination env vars.
- Opt-in live smoke documentation.

## Planner Notes

- Do not require live CoinGecko calls in default tests.
- Keep live smoke commands clearly opt-in.
- Do not document scheduler setup as implemented.
- Mention installed command form and npm local command form where useful:
  - `npm run market-pipe -- coingecko run --entity ...`
  - `market-pipe coingecko run --entity ...`

## Implementation Plan

1. Add endpoint-level mocked tests.
2. Add or extend DB-backed tests for idempotence.
3. Update `.env.example`.
4. Update README quickstart/usage for Phase 2.
5. Run typecheck, unit tests, and DB-backed tests when Postgres is available.

## Acceptance Criteria

- [ ] Mocked tests cover all Phase 2 entities.
- [ ] Default tests do not require live CoinGecko calls.
- [ ] Representative DB-backed tests prove idempotent raw landing.
- [ ] README documents manual commands for new endpoints.
- [ ] README documents opt-in live smoke run.
- [ ] `.env.example` includes retry and pagination variables.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

Reviewer finding:

- The task scope asks for "DB-backed idempotence tests for representative simple and parameterized endpoints", but the current DB-backed tests only cover `coins_list`, `trending_search`, and paginated `exchanges`. Parameterized endpoints are covered by mocked extraction/URL tests, but not by a Postgres idempotent raw-landing test. Add a DB-backed test that inserts/upserts at least one parameterized entity such as `coins_id_history` or `coins_id_ohlc` into its raw table and verifies the composite id is stable and reruns update rather than duplicate.

Reviewer live-smoke findings:

- Running all Phase 2 entities against the real CoinGecko API found that `asset_platforms_list` fails on current live data because CoinGecko returns one asset platform with a blank `id`: `name=Mavryk Network`, `native_coin_id=mavryk-network`. The current mapper requires `platform.id`, so ingestion exits with `CoinGecko asset_platforms_list row is missing platform.id`.
- Running `trending_search` against the real API fails because trending category ids are numeric, not strings. Current mapping expects a string `item.id`, so all trending categories with numeric ids fail.
- The documented/example `coins_id_history --date 01-01-2024` fails for the current CoinGecko demo/public API because it is outside the allowed 365-day historical range. A recent date such as `01-07-2026` succeeds.

Reviewer recommendations:

- For `asset_platforms_list`, define an explicit composite/fallback id for this endpoint instead of accepting blank ids globally. Recommended raw id rule:
  - use `platform.id` when non-blank;
  - otherwise use `native_coin:<native_coin_id>` when present;
  - otherwise fail fast.
  This keeps the Phase 2 fail-fast rule for truly unidentified rows while handling CoinGecko's real blank platform id without positional or hash ids.
- For `trending_search`, allow category ids to be string or number, normalize to string, and keep the typed raw id shape `category:<id>`. Keep coin and NFT ids strict unless live data proves otherwise.
- For README and live smoke docs, replace fixed old `coins_id_history` examples with a recent-date note. Recommended wording: "Use a date within the past 365 days for CoinGecko demo/public API keys." The example can use a clearly recent date for this phase, or describe the `dd-mm-yyyy` format without hardcoding an old date.
- Add mocked regression tests for the blank asset platform id fallback and numeric trending category ids.
- Rerun the full endpoint smoke manually after the fix:
  - `asset_platforms_list`
  - `trending_search`
  - `coins_id_history` with a recent date
