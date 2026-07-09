---
id: task-0027
title: "Phase 5: add Agent Local live fixture acceptance"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0026
---



# Task

## Context

Phase 5 plan: `docs/phases/phase-05-agent-local-datastore.md`.

The live acceptance fixture is `/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite`.

## Goal

Add opt-in live acceptance coverage that syncs the full local `agent-pipe` datastore and verifies warehouse counts.

## Scope

- Gate the test behind existing DB-test conventions plus `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH`.
- Use the full live SQLite fixture, not a row subset.
- Ingest all `records` rows for `project_id = agent-pipe`.
- Verify Postgres counts by `project_id` and `entity` match SQLite.
- Verify rerun idempotence against the live fixture.
- Keep the test skipped by default when local Postgres or the live path is unavailable.

## Planner Notes

- Current live entities include `coin_history`, `coins_list`, `notes`, `rates`, and `tickers`; do not hard-code that exact set unless the test reads it from SQLite first.
- The test should fail on count mismatch, not on normal growth of the local fixture.
- Do not commit the live SQLite file or absolute path into config.

## Implementation Plan

1. Add a live DB test using the same opt-in style as existing DB/live tests.
2. Read expected counts from SQLite grouped by `project_id` and `entity`.
3. Run Agent Local ingestion through the public runner or CLI path.
4. Query `agent_pipe.raw_local__records` for actual counts.
5. Rerun ingestion and assert counts stay stable.
6. Update Phase 5 notes or README with the live acceptance command if needed.

## Acceptance Criteria

- [ ] Default `npm test` skips the live fixture test unless env gates are set.
- [ ] Live fixture test ingests all current `agent-pipe` rows.
- [ ] Postgres counts by `project_id` and `entity` match SQLite counts.
- [ ] Rerunning the live fixture does not change row counts.
- [ ] The live SQLite path is supplied by `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH`.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] Opt-in DB/live test passes when local Postgres and the live fixture are available.

## Notes
- Reviewer: accepted on 2026-07-09. Verified default `npm test` skips the live fixture test, and `MARKET_PIPE__RUN_DB_TESTS=1 MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite npm test` passes against local Postgres and the real Agent Local fixture.
