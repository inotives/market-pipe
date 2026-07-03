---
id: task-0010
title: "Phase 2: add parameterized CoinGecko endpoint CLI support"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0009
---

# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

Some CoinGecko endpoints require manual parameters and should still land idempotently in raw tables.

## Goal

Add CLI parameter support and ingestion for `coins_id_history` and `coins_id_ohlc`.

## Scope

- `coins_id_history`
  - Endpoint: `GET /coins/{id}/history`
  - CLI: `--id <coin_id> --date <dd-mm-yyyy>`
  - Raw id: `<coin_id>:<date>`
- `coins_id_ohlc`
  - Endpoint: `GET /coins/{id}/ohlc`
  - CLI: `--id <coin_id> --vs-currency <currency> --days <days>`
  - Accepted `days`: `1`, `7`, `14`, `30`, `90`, `180`, `365`
  - Raw id: `<coin_id>:<vs_currency>:<days>`

## Planner Notes

- Validate required params before making network calls.
- Keep date format aligned with CoinGecko docs: `dd-mm-yyyy`.
- Store the full endpoint response as the payload for each parameterized raw row.
- Do not implement historical backfill loops in Phase 2.

## Implementation Plan

1. Extend CLI parsing for endpoint-specific options.
2. Validate params per entity.
3. Build endpoint URLs safely from validated params.
4. Insert/upsert one raw row per parameterized request.
5. Add mocked tests for success and validation failures.

## Acceptance Criteria

- [ ] `coins_id_history` requires `--id` and `--date`.
- [ ] `coins_id_history` validates `date` as `dd-mm-yyyy`.
- [ ] `coins_id_history` raw id is `<coin_id>:<date>`.
- [ ] `coins_id_ohlc` requires `--id`, `--vs-currency`, and `--days`.
- [ ] `coins_id_ohlc` rejects unsupported `days` values.
- [ ] `coins_id_ohlc` raw id is `<coin_id>:<vs_currency>:<days>`.
- [ ] Missing params fail before network calls.

## Notes
