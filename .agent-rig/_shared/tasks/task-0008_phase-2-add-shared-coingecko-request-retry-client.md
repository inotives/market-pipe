---
id: task-0008
title: "Phase 2: add shared CoinGecko request retry client"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0007
---

# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

CoinGecko ingestion needs bounded retry behavior before more endpoints are added.

## Goal

Add a small shared CoinGecko request helper that retries transient API failures consistently.

## Scope

- Centralize CoinGecko HTTP calls behind a feature-local helper.
- Retry status codes:
  - `429`
  - `500`
  - `502`
  - `503`
  - `504`
- Defaults:
  - attempts: `3`
  - base backoff: `1000ms`
- Respect `Retry-After` when present.
- Add env configuration:
  - `MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS`
  - `MARKET_PIPE__COINGECKO_RETRY_BASE_MS`
- Keep existing API key handling.

## Planner Notes

- No new dependency unless Node built-ins and existing runtime APIs are insufficient.
- No broad provider abstraction.
- Keep retry behavior easy to test with mocked fetch responses.

## Implementation Plan

1. Inspect current CoinGecko fetch code.
2. Add the smallest feature-local request helper.
3. Wire existing `coins_list` through the helper.
4. Add focused retry tests.
5. Run typecheck and relevant tests.

## Acceptance Criteria

- [ ] `coins_list` still works through the request helper.
- [ ] Transient statuses retry up to the configured attempt limit.
- [ ] `Retry-After` overrides default backoff when present.
- [ ] Non-retryable statuses fail without retrying.
- [ ] Retry env vars are validated through existing config patterns.
- [ ] Tests cover retry behavior.

## Notes
