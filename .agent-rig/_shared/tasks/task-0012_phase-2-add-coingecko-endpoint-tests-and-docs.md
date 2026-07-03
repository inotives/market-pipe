---
id: task-0012
title: "Phase 2: add CoinGecko endpoint tests and docs"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0011
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
