---
id: task-0016
title: "Phase 3: add Alpha Vantage CLI run command and symbol option"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0015
message: "Accepted by reviewer: alphavantage run CLI is registered with
  --symbol, single-symbol and YAML-loop execution are covered by mocked tests,
  quota preflight and configured delay behavior are verified, and
  typecheck/default tests pass."
---




# Task

## Context

Phase 3 plan: `docs/phases/phase-03-alpha-vantage.md`.

The core ingestion path should process one symbol. The all-symbol command loops through configured YAML symbols by calling the same single-symbol path.

## Goal

Expose Alpha Vantage daily ingestion through `market-pipe alphavantage run`, with optional single-symbol execution.

## Scope

- Add CLI command: `market-pipe alphavantage run`.
- Add `--symbol <symbol>` for one-symbol manual runs.
- Default run loads symbols from `src/features/alphavantage/config.yaml`.
- Default run loops through configured symbols using the single-symbol path.
- Apply the per-run quota guard before starting the loop.
- Wait `rateLimit.delayMs` between symbol API calls in all-symbol mode.

## Planner Notes

- `--symbol MSFT` should make exactly one Alpha Vantage request.
- The all-symbol loop exists for convenience; do not create scheduler behavior in Phase 3.
- Keep command syntax consistent with existing npm and installed CLI usage.

## Implementation Plan

1. Inspect existing CoinGecko CLI command registration.
2. Add Alpha Vantage command registration.
3. Wire `--symbol` to the single-symbol runner.
4. Wire no-symbol mode to YAML symbol iteration and delay.
5. Add mocked CLI tests for single-symbol and all-symbol modes.

## Acceptance Criteria

- [ ] `market-pipe alphavantage run --symbol MSFT` runs only `MSFT`.
- [ ] `market-pipe alphavantage run` loops through YAML symbols.
- [ ] All-symbol mode applies the quota guard before API requests.
- [ ] All-symbol mode waits `rateLimit.delayMs` between symbols.
- [ ] Default tests cover symbol iteration without live API calls.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
