---
id: task-0017
title: "Phase 3: add Alpha Vantage tests live smoke and docs"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0016
message: "Accepted by reviewer: README docs now match the Phase 3/4/5 plan,
  mocked tests cover symbol iteration, timestamp identity and quota guard
  behavior, live Alpha Vantage smoke is opt-in with MSFT default, and
  typecheck/default/DB-backed tests pass."
---







# Task

## Context

Phase 3 plan: `docs/phases/phase-03-alpha-vantage.md`.

This task closes Phase 3 by making Alpha Vantage ingestion testable and documented from a fresh checkout.

## Goal

Add final mocked tests, skipped-by-default live smoke coverage, and README/docs updates for Alpha Vantage daily stock OHLCV ingestion.

## Scope

- Mocked tests for symbol iteration.
- Mocked tests for timestamp identity.
- Mocked tests for quota guard behavior.
- DB-backed test coverage for raw idempotence where not already covered.
- Skipped-by-default live smoke test wired to `MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1`.
- Default live smoke symbol: `MSFT`.
- README updates for Alpha Vantage setup and commands.
- Docs for quota behavior and the 25 requests/day free-tier assumption.

## Planner Notes

- Live smoke must not run by default.
- Live smoke should call one symbol only unless explicitly overridden.
- Do not run the full YAML symbol list in default live smoke tests.
- Do not print `.env.local` or the API key.
- Manual live reviewer check should be possible with:
  - `MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1 npm test`
  - `npm run market-pipe -- alphavantage run --symbol MSFT`

## Implementation Plan

1. Fill any remaining mocked tests around symbol iteration, timestamp identity, and quota guard behavior.
2. Add skipped-by-default live smoke coverage for `MSFT`.
3. Update README and relevant docs.
4. Run typecheck and default tests.
5. Run DB-backed tests when Postgres is available.
6. Document the opt-in live smoke command without requiring it in default CI.

## Acceptance Criteria

- [ ] Mocked tests cover symbol iteration.
- [ ] Mocked tests cover timestamp identity.
- [ ] Mocked tests cover the over-quota preflight failure.
- [ ] Default tests do not call Alpha Vantage.
- [ ] Live smoke only runs when `MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1`.
- [ ] Default live smoke symbol is `MSFT`.
- [ ] README documents Alpha Vantage setup, commands, and quota behavior.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

Reviewer finding:

- `README.md` has the Phase Plan order wrong. Lines 210-211 list Phase 4 as `dbt Transforms` and Phase 5 as `Custom CSV`, but `docs/phases/README.md` and `docs/project_specs.md` now define Phase 4 as `Custom CSV` and Phase 5 as `dbt Transforms`. Update the README phase list to match the authoritative phase docs.

Reviewer verification:

- `npm run typecheck` passes.
- `npm test` passes.
