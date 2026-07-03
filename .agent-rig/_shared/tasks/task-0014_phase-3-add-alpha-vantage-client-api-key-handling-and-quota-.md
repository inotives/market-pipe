---
id: task-0014
title: "Phase 3: add Alpha Vantage client, API key handling, and quota guard"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0013
---

# Task

## Context

Phase 3 plan: `docs/phases/phase-03-alpha-vantage.md`.

Task 0013 adds the source skeleton and config. This task adds request handling but does not land raw rows yet.

## Goal

Add an Alpha Vantage client for `TIME_SERIES_DAILY`, API-key validation, and a per-run quota guard.

## Scope

- Read API key from `MARKET_PIPE__ALPHAVANTAGE_API_KEY`.
- Fail real runs at startup when the API key is missing.
- Build `TIME_SERIES_DAILY` requests with:
  - `function=TIME_SERIES_DAILY`
  - `symbol=<symbol>`
  - `outputsize=compact`
  - `apikey=<key>`
- Add a per-run quota guard that fails before API calls when planned symbols exceed `quota.dailyRequestLimit`.
- Preserve Alpha Vantage success and error payloads for caller handling.

## Planner Notes

- The quota guard is per command run only. Do not add a persisted request log or metadata table.
- Avoid spending live Alpha Vantage quota in default tests.
- Use existing project env/config patterns before adding new ones.

## Implementation Plan

1. Inspect the CoinGecko client and env handling.
2. Add an Alpha Vantage client around the project HTTP pattern.
3. Add API-key validation for real runs.
4. Add per-run quota validation from YAML config.
5. Add mocked tests for request construction and quota failure.

## Acceptance Criteria

- [ ] Missing `MARKET_PIPE__ALPHAVANTAGE_API_KEY` fails real Alpha Vantage runs before HTTP requests.
- [ ] Client requests use `TIME_SERIES_DAILY` and `outputsize=compact`.
- [ ] A planned run over `quota.dailyRequestLimit` fails before making API requests.
- [ ] Default tests do not call Alpha Vantage.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
